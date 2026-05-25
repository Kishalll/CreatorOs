require("dotenv").config();
const cookieParser = require("cookie-parser");
const express = require('express');
const passport = require("passport");

const app = express();

const connectDB = require("./conect");
const authRoutes = require("./routes/auth");
const collaborationRoutes = require('./routes/collaboration');
const { acceptInvite, acceptInviteFromDashboard } = require('./controller/collaborationController');

connectDB();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());
app.set("view engine", "ejs");
app.use("/", authRoutes);

const protect = require("./middleware/auth");

const path = require('path');
const shortid = require('shortid');
const multer = require('multer');
const User = require('./model/user');
const Invite = require('./model/invite');
const Service = require('./model/service');
const Url = require('./model/url');
const UploadedFile = require('./model/uploadedFile');

const port = process.env.PORT || 3000;
const urlRoutes = require('./routes/url');

const suggestionRoutes = require('./routes/suggestionRoutes');
app.use('/suggestions', protect, suggestionRoutes);
app.use('/services/creator-crm', protect, collaborationRoutes);
app.post('/dashboard/accept-invite', protect, acceptInviteFromDashboard);
app.get('/invites/accept/:token', acceptInvite);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

app.use('/url', urlRoutes);

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, "/tmp"); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

async function buildShortenerViewModel(req, shortId = null, error = null) {
    return {
        service: await Service.findByKey('url-shortener'),
        shortUrl: shortId ? `${req.protocol}://${req.get('host')}/u/${shortId}` : null,
        error,
    };
}

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

app.get("/dashboard", protect, async (req, res) => {
    const userDoc = await User.findById(req.user.id);
    const services = await Service.findAll();
    const inviteSummary = await Invite.summarizeByInviter(req.user.id);
    const urlStats = await Url.dashboardStats(req.user.id);
    const recentLinks = await Url.recentByUser(req.user.id, 5);
    const clickSeries = await Url.clicksByDay(req.user.id, 7);
    const topReferrers = await Url.topReferrers(req.user.id, 5);

    res.render("dashboard", {
        user: buildAccountViewModel(userDoc, req.user),
        services,
        inviteSummary,
        urlStats,
        recentLinks,
        clickSeries,
        topReferrers,
        appBaseUrl: process.env.APP_URL || `${req.protocol}://${req.get('host')}`,
        inviteAcceptMessage: null,
        inviteAcceptError: null,
    });
});

app.get("/profile", protect, async (req, res) => {
    const userDoc = await User.findById(req.user.id);

    res.render("profile", { user: buildAccountViewModel(userDoc, req.user) });
});

app.get('/', async (req, res, next) => {
    try {
        const [services, serviceSummary] = await Promise.all([
            Service.findAll(),
            Service.getSummary(),
        ]);
        res.render('services-hub', { services, serviceSummary });
    } catch (error) {
        next(error);
    }
});

app.get('/services', (req, res) => {
    res.redirect('/');
});

app.get('/services/:serviceKey', protect, async (req, res, next) => {
    try {
        const service = await Service.findByKey(req.params.serviceKey);

        if (!service) {
            return res.status(404).render('coming-soon', {
                service: {
                    name: 'Unknown service',
                    description: 'This service does not exist in the current module registry.',
                    status: 'coming_soon',
                },
            });
        }

        if (service.status !== 'available') {
            return res.render('coming-soon', { service });
        }

        if (service.key === 'url-shortener') {
            return res.render('home', await buildShortenerViewModel(req));
        }

        if (service.key === 'suggestion-tool') {
            return res.redirect('/suggestions');
        }

        if (service.key === 'creator-crm') {
            return res.redirect('/services/creator-crm');
        }

        if (service.key === 'file-upload') {
            return res.render('file-upload');
        }

        return res.render('coming-soon', { service });
    } catch (error) {
        next(error);
    }
});

app.post('/services/url-shortener/shorten', protect, async (req, res) => {
    const { redirectUrl } = req.body;
    if (!redirectUrl) {
        return res.render('home', await buildShortenerViewModel(req, null, 'Please enter a URL.'));
    }

    try {
        const shortId = shortid();

        await Url.create({
            userId: req.user.id,
            shortId,
            redirectUrl,
        });

        return res.render('home', await buildShortenerViewModel(req, shortId));
    } catch (err) {
        console.error('Error creating short URL:', err);
        return res.render('home', await buildShortenerViewModel(req, null, 'An unexpected error occurred.'));
    }
});

app.post('/services/file-upload/upload', protect, upload.single('file'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const uploadedFile = await UploadedFile.create({
            userId: req.user.id,
            originalName: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        });

        return res.json({
            id: uploadedFile.id,
            filename: uploadedFile.originalName,
            size: uploadedFile.size,
            mimetype: uploadedFile.mimetype,
            path: uploadedFile.storedName,
        });
    } catch (error) {
        next(error);
    }
});

app.get('/u/:shortId', async (req, res) => {
    const shortId = req.params.shortId;

    const entry = await Url.recordClick(shortId, {
        referrer: req.get('referer'),
        userAgent: req.get('user-agent'),
    });

    if (entry) {
        return res.redirect(entry.redirectUrl);
    } else {
        return res.status(404).send('URL not found');
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
