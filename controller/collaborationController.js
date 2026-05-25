const crypto = require('crypto');
const Invite = require('../model/invite');
const User = require('../model/user');
const Service = require('../model/service');
const Url = require('../model/url');
const { sendInvitationEmail } = require('../utils/email');

function buildAccountViewModel(userDoc, fallbackUser) {
  const name = userDoc?.name || 'Creator';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'CR';

  return {
    id: fallbackUser.id,
    name,
    email: userDoc?.email || '',
    createdAt: userDoc?.createdAt,
    initials,
  };
}

const getCreatorCrmPage = async (req, res, next) => {
  try {
    const [userDoc, invites, services] = await Promise.all([
      User.findById(req.user.id),
      Invite.findByInviter(req.user.id, { limit: 12 }),
      Service.findAll(),
    ]);

    res.render('creator-crm', {
      user: buildAccountViewModel(userDoc, req.user),
      invites,
      services,
      success: null,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

const sendCollaboratorInvite = async (req, res, next) => {
  const { email, projectName, message } = req.body || {};

  if (!email) {
    const [userDoc, invites, services] = await Promise.all([
      User.findById(req.user.id),
      Invite.findByInviter(req.user.id, { limit: 12 }),
      Service.findAll(),
    ]);
    return res.status(400).render('creator-crm', {
      user: buildAccountViewModel(userDoc, req.user),
      invites,
      services,
      success: null,
      error: 'Please provide an email address for the collaborator.',
    });
  }

  try {
    const token = crypto.randomBytes(22).toString('hex');
    const invite = await Invite.create({
      inviter: req.user.id,
      email: email.trim().toLowerCase(),
      projectName: projectName?.trim() || process.env.DEFAULT_PROJECT_NAME || 'CreatorOS Collaboration',
      message: message?.trim(),
      token,
    });

    const inviteUrl = `${process.env.APP_URL || `${req.protocol}://${req.get('host')}`}/invites/accept/${token}`;
    const userDoc = await User.findById(req.user.id);

    await sendInvitationEmail({
      to: invite.email,
      inviterName: userDoc?.name || 'CreatorOS',
      projectName: invite.projectName,
      inviteUrl,
      personalMessage: invite.message,
    });

    const [invites, services] = await Promise.all([
      Invite.findByInviter(req.user.id, { limit: 12 }),
      Service.findAll(),
    ]);
    res.render('creator-crm', {
      user: buildAccountViewModel(userDoc, req.user),
      invites,
      services,
      success: `Invite sent successfully to ${invite.email}.`,
      error: null,
    });
  } catch (error) {
    console.error('Collaborator invite failed:', error);

    const [userDoc, invites, services] = await Promise.all([
      User.findById(req.user.id),
      Invite.findByInviter(req.user.id, { limit: 12 }),
      Service.findAll(),
    ]);

    res.status(500).render('creator-crm', {
      user: buildAccountViewModel(userDoc, req.user),
      invites,
      services,
      success: null,
      error: `Unable to send invite: ${error.message || 'Unexpected error'}`,
    });
  }
};

const renderDashboard = async (req, res, options = {}) => {
  const userDoc = await User.findById(req.user.id);
  const services = await Service.findAll();
  const inviteSummary = await Invite.summarizeByInviter(req.user.id);
  const urlStats = await Url.dashboardStats(req.user.id);
  const recentLinks = await Url.recentByUser(req.user.id, 5);
  const clickSeries = await Url.clicksByDay(req.user.id, 7);
  const topReferrers = await Url.topReferrers(req.user.id, 5);

  return res.render('dashboard', {
    user: buildAccountViewModel(userDoc, req.user),
    services,
    inviteSummary,
    urlStats,
    recentLinks,
    clickSeries,
    topReferrers,
    appBaseUrl: process.env.APP_URL || `${req.protocol}://${req.get('host')}`,
    inviteAcceptMessage: options.inviteAcceptMessage || null,
    inviteAcceptError: options.inviteAcceptError || null,
  });
};

const acceptInvite = async (req, res, next) => {
  try {
    const invite = await Invite.findByToken(req.params.token);

    if (!invite) {
      return res.status(404).render('invite-accept', {
        status: 'missing',
        invite: null,
      });
    }

    if (invite.status === 'accepted') {
      return res.render('invite-accept', {
        status: 'accepted',
        invite,
      });
    }

    const acceptedInvite = await Invite.acceptByToken(req.params.token);

    res.render('invite-accept', {
      status: 'accepted',
      invite: acceptedInvite,
    });
  } catch (error) {
    next(error);
  }
};

const acceptInviteFromDashboard = async (req, res, next) => {
  const { inviteToken } = req.body || {};

  if (!inviteToken || !inviteToken.trim()) {
    return renderDashboard(req, res, { inviteAcceptError: 'Please paste a valid invite token.' });
  }

  try {
    const invite = await Invite.findByToken(inviteToken.trim());

    if (!invite) {
      return renderDashboard(req, res, { inviteAcceptError: 'No invitation found for that token.' });
    }

    if (invite.status === 'accepted') {
      return renderDashboard(req, res, { inviteAcceptMessage: 'This invitation has already been accepted.' });
    }

    const acceptedInvite = await Invite.acceptByToken(inviteToken.trim());

    return renderDashboard(req, res, {
      inviteAcceptMessage: `Invitation for ${acceptedInvite.email} was accepted successfully!`,
    });
  } catch (error) {
    console.error('Dashboard invite acceptance failed:', error);
    return renderDashboard(req, res, {
      inviteAcceptError: 'Unable to accept invite at this time. Please try again later.',
    });
  }
};

module.exports = {
  getCreatorCrmPage,
  sendCollaboratorInvite,
  acceptInvite,
  acceptInviteFromDashboard,
};
