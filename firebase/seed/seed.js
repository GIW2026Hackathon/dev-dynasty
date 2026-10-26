import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, './serviceAccount.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "giw-agritech.firebasestorage.app"
});

const db = admin.firestore();
const auth = admin.auth();

async function seedData() {
  console.log("Starting seed process...");

  const wards = [
    { id: "kisii_central", county: "Kisii", ward: "Kisii Central", constituency: "Kitutu Chache North" },
    { id: "nyaribari", county: "Kisii", ward: "Nyaribari Chache", constituency: "Nyaribari Chache" },
    { id: "kitutu_masaba", county: "Kisii", ward: "Kitutu Masaba", constituency: "Kitutu Masaba" },
    { id: "bobasi", county: "Kisii", ward: "Bobasi", constituency: "Bobasi" }
  ];

  for (const w of wards) {
    await db.collection("wards").doc(w.id).set(w);
  }

  const reasonCodes = [
    { type: "review", code: "abusive_language", label: "Abusive Language" },
    { type: "review", code: "spam_fake", label: "Spam or Fake Review" },
    { type: "review", code: "off_topic", label: "Off Topic" },
    { type: "listing", code: "misleading", label: "Misleading Info" },
    { type: "listing", code: "prohibited", label: "Prohibited Item" }
  ];
  
  for (const rc of reasonCodes) {
    await db.collection("reason_codes").add(rc);
  }

  // Updated to include 'phone' and 'whatsapp'
  const demoUsers = [
    { email: "admin@gmail.com", password: "123456", role: "admin", name: "Admin User", ward: "kisii_central", phone: "0114135647", whatsapp: "0114135647" },
    { email: "officer@gmail.com", password: "123456", role: "officer", name: "Officer John", ward: "kisii_central", phone: "0114135647", whatsapp: "0114135647" },
    { email: "farmer1@gmail.com", password: "123456", role: "farmer", name: "Farmer David", ward: "kisii_central", phone: "0114135647", whatsapp: "0114135647" },
    { email: "farmer2@gmail.com", password: "123456", role: "farmer", name: "Farmer Mary", ward: "nyaribari", phone: "0114135647", whatsapp: "0114135647" },
    { email: "buyer1@gmail.com", password: "123456", role: "buyer", name: "Buyer Sarah", ward: "kisii_central", phone: "0114135647", whatsapp: "0114135647" }
  ];

  for (const u of demoUsers) {
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.name,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(u.email);
      } else {
        throw error;
      }
    }

    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      role: u.role,
      email: u.email,
      fullName: u.name,
      phone: u.phone,
      whatsapp: u.whatsapp, // Saved separately
      county: "Kisii",
      ward: u.ward,
      status: "active",
      termsAcceptedAt: new Date(),
      termsVersion: "1.0",
      createdAt: new Date()
    });

    if (u.role === "farmer") {
      await db.collection("farmers").doc(userRecord.uid).set({
        userId: userRecord.uid,
        verificationStatus: u.email === "farmer1@gmail.com" ? "verified" : "pending",
        verifiedBy: u.email === "farmer1@gmail.com" ? "admin_placeholder" : null,
        ratingAvg: 0,
        ratingCount: 0,
        reviewCountPending: 0
      });
    }
  }
  console.log("🎉 Seed complete!");
  process.exit(0);
}

seedData().catch(console.error);