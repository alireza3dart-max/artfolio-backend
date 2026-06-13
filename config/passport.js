const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const avatar = profile.photos?.[0]?.value || '';
    const name = profile.displayName || 'Artist';

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name: name,
        email: email,
        avatar: avatar,
        password: Math.random().toString(36) + Math.random().toString(36),
        googleId: String(profile.id),
        followers: 0,
        following: 0,
        followingList: [],
        followedBy: [],
        bio: '',
        location: '',
        role: '3D Artist',
      });
      await user.save();
    } else {
      // آپدیت googleId اگه نداشت
      if (!user.googleId) {
        user.googleId = String(profile.id);
        await user.save();
      }
    }

    return done(null, user);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;