// app.js
const express = require('express');
const path = require('path');
const app = express();
const expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const pages = ['home', 'dataset', 'timeline', 'registration', 'prizes', 'results', 'team', 'contact'];
pages.forEach(page => {
  app.get(`/${page === 'home' ? '' : page}`, (req, res) => {
    res.render(page, { current: page });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
