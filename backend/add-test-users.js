const db = require('./db');
const bcrypt = require('bcrypt');

async function addTestUsers() {
  const testUsers = [
    { email: 'test@test.com', password: '123456', name: 'Test User' },
    { email: 'user@example.com', password: 'password', name: 'Example User' }
  ];

  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await new Promise((resolve, reject) => {
      db.run('INSERT OR IGNORE INTO users (email, password, name) VALUES (?, ?, ?)',
        [user.email, hashedPassword, user.name], function(err) {
        if (err) {
          console.error('Error adding user:', user.email, err.message);
          reject(err);
        } else {
          console.log('✅ Test user added:', user.email);
          resolve();
        }
      });
    });
  }

  // Check existing users
  db.all('SELECT email, name FROM users', (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
    } else {
      console.log('All users:', rows);
    }
    process.exit();
  });
}

addTestUsers();
