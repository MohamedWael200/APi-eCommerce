const cron = require("node-cron");
const User = require("../models/User");
const sendEmail = require("../utils/SendEmail");
const Category = require("../models/Category");

// 🕐 تقارير يومية ترسل لكل أدمن عن كل التصنيفات
cron.schedule("* * * * *", async () => {
  try {
    console.log("⏰ Running daily category report at", new Date());

    const categories = await Category.find();
    const admins = await User.find({ role: "admin" });

    if (admins.length === 0) {
      return console.log("⚠️ No admins found");
    }

    if (categories.length === 0) {
      return console.log("⚠️ No categories found");
    }

    // تحضير التقرير على شكل HTML منسق
    const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4CAF50;">📊 Daily Category Report</h2>
        <p>Hello,</p>
        <p>Here is the list of all categories:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 8px;">#</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Category Name</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map((cat, index) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${cat.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${cat.status || 'Active'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="margin-top: 20px;">Have a great day! 😊</p>
      </div>
    `;

    for (const admin of admins) {
      await sendEmail(
        admin.email,
        "📊 Daily Category Report",
        "", // محتوى نصي فارغ
        reportHtml // الإيميل المنسق بـ HTML
      );
      console.log(`✅ Report sent to ${admin.email}`);
    }

  } catch (error) {
    console.error("❌ Cron Job Error:", error.message);
  }
});
