#!/usr/bin/env node

/**
 * VAPID Key Generator for Push Notifications
 * 
 * Run this script to generate VAPID keys:
 * node scripts/generate-vapid-keys.js
 * 
 * Then add the keys to your .env file:
 * VAPID_PUBLIC_KEY=...
 * VAPID_PRIVATE_KEY=...
 * VAPID_EMAIL=mailto:your@email.com
 */

import webpush from 'web-push';

console.log('🔐 Generating VAPID Keys for Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Add these to your .env file:\n');
console.log('─'.repeat(60));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@novaplex.xyz`);
console.log('─'.repeat(60));

console.log('\n✅ Keys generated successfully!');
console.log('\n📝 Notes:');
console.log('  - Keep the private key SECRET');
console.log('  - The public key is safe to expose to clients');
console.log('  - Change the VAPID_EMAIL to your admin email');
