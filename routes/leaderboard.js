const express = require('express');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const router = express.Router();

// Top Artists by likes
router.get('/artists', async (req, res) => {
  try {
    const { period = 'all', limit = 20 } = req.query;
    const artworks = await Artwork.find().populate('artist', 'name avatar followers');
    
    // جمع لایک و ویو برای هر آرتیست
    const artistStats = {};
    artworks.forEach(art => {
      if (!art.artist?._id) return;
      const id = art.artist._id.toString();
      if (!artistStats[id]) {
        artistStats[id] = {
          _id: art.artist._id,
          name: art.artist.name,
          avatar: art.artist.avatar,
          followers: art.artist.followers || 0,
          totalLikes: 0,
          totalViews: 0,
          artworkCount: 0,
        };
      }
      artistStats[id].totalLikes += art.likes || 0;
      artistStats[id].totalViews += art.views || 0;
      artistStats[id].artworkCount++;
    });

    const sorted = Object.values(artistStats)
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, Number(limit));

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Top Artworks
router.get('/artworks', async (req, res) => {
  try {
    const { sort = 'likes', limit = 20 } = req.query;
    const sortField = sort === 'views' ? { views: -1 } : { likes: -1 };
    const artworks = await Artwork.find()
      .populate('artist', 'name avatar')
      .sort(sortField)
      .limit(Number(limit));
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;