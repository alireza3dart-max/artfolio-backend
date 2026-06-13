const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"ArtFolio" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ Email error:', err.message);
    return false;
  }
};

// Templates
const emailTemplates = {

  welcome: (name) => `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);padding:40px;text-align:center;">
        <h1 style="margin:0;font-size:32px;">🎨 ArtFolio</h1>
        <p style="margin:8px 0 0;opacity:0.85;">The world's premier art platform</p>
      </div>
      <div style="padding:40px;">
        <h2 style="color:#f0eeff;">Welcome, ${name}! 🎉</h2>
        <p style="color:#a89ec8;line-height:1.7;">Your ArtFolio account is ready. Start sharing your amazing artwork with millions of artists worldwide!</p>
        <div style="margin:32px 0;text-align:center;">
          <a href="https://artfolio-frontend-lac.vercel.app/upload" style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">🚀 Upload Your First Artwork</a>
        </div>
        <div style="border:1px solid #2d2850;border-radius:12px;padding:20px;margin-top:24px;">
          <h3 style="color:#7c5cfc;margin:0 0 12px;">What you can do:</h3>
          <p style="color:#a89ec8;margin:6px 0;">🎨 Upload unlimited artworks</p>
          <p style="color:#a89ec8;margin:6px 0;">💰 Sell your work worldwide</p>
          <p style="color:#a89ec8;margin:6px 0;">👥 Connect with artists</p>
          <p style="color:#a89ec8;margin:6px 0;">📊 Track your analytics</p>
        </div>
      </div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #2d2850;">
        <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc. · San Francisco, CA · <a href="#" style="color:#7c5cfc;">Unsubscribe</a></p>
      </div>
    </div>
  `,

  ticketReply: (name, subject, reply) => `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">🎧 Support Reply</h1>
      </div>
      <div style="padding:36px;">
        <h2 style="color:#f0eeff;">Hi ${name},</h2>
        <p style="color:#a89ec8;">We've replied to your support ticket: <strong style="color:#7c5cfc;">${subject}</strong></p>
        <div style="background:#1a1730;border:1px solid #2d2850;border-radius:12px;padding:20px;margin:24px 0;">
          <p style="color:#f0eeff;line-height:1.7;margin:0;">${reply}</p>
        </div>
        <div style="text-align:center;margin-top:28px;">
          <a href="https://artfolio-frontend-lac.vercel.app/support" style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View My Tickets</a>
        </div>
      </div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #2d2850;">
        <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc.</p>
      </div>
    </div>
  `,

  artworkSold: (name, artworkTitle, amount) => `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00e676,#00a844);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">💰 Artwork Sold!</h1>
      </div>
      <div style="padding:36px;">
        <h2 style="color:#f0eeff;">Congrats ${name}! 🎉</h2>
        <p style="color:#a89ec8;">Your artwork <strong style="color:#00e676;">"${artworkTitle}"</strong> has been sold!</p>
        <div style="background:#1a1730;border:1px solid #00e67630;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
          <p style="color:#a89ec8;margin:0 0 8px;font-size:14px;">Amount Earned</p>
          <p style="color:#00e676;font-size:40px;font-weight:900;margin:0;letter-spacing:-1px;">$${amount}</p>
        </div>
        <div style="text-align:center;">
          <a href="https://artfolio-frontend-lac.vercel.app/wallet" style="background:linear-gradient(135deg,#00e676,#00a844);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View My Wallet</a>
        </div>
      </div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #2d2850;">
        <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc.</p>
      </div>
    </div>
  `,

  resetPassword: (name, resetLink) => `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#ff5252,#ff1744);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">🔑 Reset Password</h1>
      </div>
      <div style="padding:36px;">
        <h2 style="color:#f0eeff;">Hi ${name},</h2>
        <p style="color:#a89ec8;line-height:1.7;">We received a request to reset your password. Click below to create a new one. This link expires in 1 hour.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetLink}" style="background:linear-gradient(135deg,#ff5252,#ff1744);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">Reset My Password</a>
        </div>
        <p style="color:#6b6488;font-size:13px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #2d2850;">
        <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc.</p>
      </div>
    </div>
  `,

  newFollower: (name, followerName) => `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">👤 New Follower!</h1>
      </div>
      <div style="padding:36px;">
        <h2 style="color:#f0eeff;">Hi ${name},</h2>
        <p style="color:#a89ec8;line-height:1.7;"><strong style="color:#7c5cfc;">${followerName}</strong> started following you on ArtFolio!</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://artfolio-frontend-lac.vercel.app/profile" style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View My Profile</a>
        </div>
      </div>
      <div style="padding:20px 40px;text-align:center;border-top:1px solid #2d2850;">
        <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc.</p>
      </div>
    </div>
  `,
};

module.exports = { sendEmail, emailTemplates };