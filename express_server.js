const express = require('express');
const app = express();
const PORT = 8080;

// config
app.set('view engine', 'ejs');
// middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser()); // populate req.cookies
app.use(express.urlencoded({ extended: true }));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

function generateRandomString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';

  while (randomString.length < 6) {
    randomString += chars[Math.floor(Math.random() * chars.length)];
  }

  return randomString;
};

app.get('/', (req, res) => {
  res.send('Hello!');
});

app.get('/urls', (req, res) => {
  const templateVars = { 
    urls: urlDatabase,
    user: users[req.cookies['user_id']]
  };
  res.render('urls_index', templateVars);
});

app.post('/urls', (req, res) => {
  let newId = generateRandomString();
  urlDatabase[newId] = req.body.longURL;
  
  res.redirect(`/urls/${newId}`);
});

app.get('/urls/new', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render('urls_new', templateVars);
});

app.get('/urls/:id', (req, res) => {
  const templateVars = {
    id: req.params.id, 
    longURL: urlDatabase[req.params.id],
    user: users[req.cookies['user_id']]
  };
  res.render('urls_show', templateVars);
});

app.post('/urls/:id', (req, res) => {
  const id = req.params.id;
  urlDatabase[id] = req.body.newUrl;
  res.redirect('/urls');
});

app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.get('/u/:id', (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});

app.get('/login', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render('urls_login',templateVars);
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    return res.status(400).send('Please enter e-mail and password');
  };
  let foundUser = null;
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      foundUser = user;
    }
  };
  if (!foundUser) {
    return res.status(403).send('No user with that email found');
  };
  if (foundUser.password !== password) {
    return res.status(403).send('Passwords do not match');
  };

  res.cookie('user_id', foundUser.id);
  // const templateVars = {
  //   user: users[req.cookies[foundUser.id]]
  // }; 
  res.redirect('/urls');
});

app.get('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  const templateVars = {
    user: users[req.cookies['user_id']]
  };
  res.render('urls_register', templateVars);
})

const getUserByEmail = function(email) {
  for (let user in users) {
    if (users[user].email === email) {
      return users[user];
    } 
  }
  return null;
};

app.post('/register', (req, res) => {
  const randomID = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;
  const newUserObj = {
    id: randomID,
    email: email,
    password: password
  };

  if (!email || !password) {
    return res.status(400).send('Please enter e-mail and password');
  }
  const userEmail = getUserByEmail(email);
  if (userEmail) {
    return res.status(400).send('The e-mail already exists');
  }

  users[randomID] = newUserObj;
  res.cookie('user_id', randomID);
  console.log(users);
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});