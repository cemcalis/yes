const db = require('./db');

// Fix image URLs to use relative paths instead of absolute localhost URLs
db.run(`UPDATE products SET image_url = REPLACE(image_url, 'http://localhost:5000', '') WHERE image_url LIKE 'http://localhost:5000%'`, (err) => {
  if (err) {
    console.error('Error updating products:', err);
  } else {
    console.log('✅ Product image URLs updated');
  }
  
  db.run(`UPDATE banners SET image_url = REPLACE(image_url, 'http://localhost:5000', '') WHERE image_url LIKE 'http://localhost:5000%'`, (err) => {
    if (err) {
      console.error('Error updating banners:', err);
    } else {
      console.log('✅ Banner image URLs updated');
    }
    
    db.run(`UPDATE users SET profile_picture = REPLACE(profile_picture, 'http://localhost:5000', '') WHERE profile_picture LIKE 'http://localhost:5000%'`, (err) => {
      if (err) {
        console.error('Error updating users:', err);
      } else {
        console.log('✅ User profile pictures updated');
      }
      
      db.close();
      console.log('✅ Database updated successfully!');
    });
  });
});
