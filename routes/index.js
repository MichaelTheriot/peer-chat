var express = require('express');

var router = express.Router();

router.route('/')
  .all(function(req, res, next) {
    res.render('index');
  });

router.route('/chat')
  .all(function(req, res, next) {
    res.render('chat');
  });

module.exports = router;