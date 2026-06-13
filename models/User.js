const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  googleId: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500,
  },
  location: {
    type: String,
    default: '',
  },
  website: {
    type: String,
    default: '',
  },
  twitter: {
    type: String,
    default: '',
  },
  instagram: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: '3D Artist',
  },
  followers: {
    type: Number,
    default: 0,
  },
  following: {
    type: Number,
    default: 0,
  },
  followingList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  followedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);