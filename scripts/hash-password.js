const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Please provide a password to hash.');
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log('Hashed password:', hash);
});
