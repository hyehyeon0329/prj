const express = require('express');
const Event = require('../../models/event'); 
const Register = require('../../models/register'); 
const LikeLog = require('../../models/like-log'); 
const catchErrors = require('../../lib/async-error');

const router = express.Router();

router.use(catchErrors(async (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    next({status: 401, msg: 'Unauthorized'});
  }
}));

router.use('/events', require('./events'));

// Like for Event
router.post('/events/:id/like', catchErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return next({status: 404, msg: 'Not exist event'});
  }
  var likeLog = await LikeLog.findOne({author: req.user._id, event: event._id});
  if (!likeLog) {
    event.numLikes++;
    await Promise.all([
      event.save(),
      LikeLog.create({author: req.user._id, event: event._id})
    ]);
  }
  return res.json(event);
}));

// Like for Register
router.post('/registers/:id/like', catchErrors(async (req, res, next) => {
  const register = await Register.findById(req.params.id);
  register.numLikes++;
  await register.save();
  return res.json(register);
}));

router.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    status: err.status,
    msg: err.msg || err
  });
});

module.exports = router;
