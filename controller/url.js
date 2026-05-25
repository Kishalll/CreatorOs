const shortid = require('shortid');
const Url = require('../model/url');
async function handleGenerateShortUrl(req, res) {
    const body= req.body;
    if(!body.redirectUrl){
        return res.status(400).json({error: "redirectUrl is required"});
    }
    const ShortId= shortid();
    
    await Url.create({
        userId: req.user?.id,
        shortId: ShortId,
        redirectUrl: body.redirectUrl,
    });

    return res.json({id: ShortId});
}

async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;
    const analytics = await Url.analyticsByShortId(shortId);
    if (!analytics) {
        return res.status(404).json({ error: "Short URL not found" });
    }
    return res.json(analytics);
}


module.exports = { handleGenerateShortUrl ,
    handleGetAnalytics
};
