const express = require('express');
const Event = require('../models/event');
const Register = require('../models/register'); 
const catchErrors = require('../lib/async-error');

const router = express.Router();

// 동일한 코드가 users.js에도 있습니다. 이것은 나중에 수정합시다.
function needAuth(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.flash('danger', 'Please signin first.');
    res.redirect('/signin');
  }
}

/* GET events listing. */
router.get('/', catchErrors(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  var query = {};
  const term = req.query.term;
  if (term) {
    query = {$or: [
      {title: {'$regex': term, '$options': 'i'}},
      {content: {'$regex': term, '$options': 'i'}},
    ]};
  }
  const events = await Event.paginate(query, {
    sort: {createdAt: -1}, 
    populate: 'author', 
    page: page, limit: limit
  });
  res.render('events/index', {events: events, term: term, query: req.query});
}));

router.get('/new', needAuth, (req, res, next) => {
  res.render('events/new', {event: {}});
});

router.get('/:id/edit', needAuth, catchErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  console.log(req.body);
  res.render('events/edit', {event: event});
}));

router.get('/:id', catchErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate('author');
  const registers = await Register.find({event: event.id}).populate('author');
  event.numReads++;    // TODO: 동일한 사람이 본 경우에 Read가 증가하지 않도록???

  await event.save();
  res.render('events/show', {event: event, registers: registers});
}));

router.put('/:id', catchErrors(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    req.flash('danger', 'Not exist event');
    return res.redirect('back');
  }
  event.title = req.body.title;
  event.location = req.body.location;
  event.starts = req.body.starts;
  event.ends = req.body.ends;
  event.content = req.body.content;
  event.organizer = req.body.organizer;  
  event.organizerdes = req.body.organizerdes; 
  event.eventType = req.body.eventType;
  event.topic = req.body.topic;
  event.ticket = req.body.ticket;
  event.price = req.body.price;
  event.tags = req.body.tags.split(" ").map(e => e.trim());

  await event.save();
  req.flash('success', 'Successfully updated');
  res.redirect('/events');
}));

router.delete('/:id', needAuth, catchErrors(async (req, res, next) => {
  await Event.findOneAndRemove({_id: req.params.id});
  req.flash('success', 'Successfully deleted');
  res.redirect('/events');
}));

router.post('/', needAuth, catchErrors(async (req, res, next) => {
  const user = req.user;
  const err = validateForm(req.body);
  
  if (err) {
    req.flash('danger', err);
    res.redirect('events/new')
  }
    var event = new Event({
    author: user._id,
    title: req.body.title,
    location: req.body.location,
    starts: req.body.starts,
    ends: req.body.ends,
    content: req.body.content,
    organizer: req.body.organizer,    
    organizerdes: req.body.organizerdes, 
    eventType: req.body.eventType,  
    topic: req.body.topic,
    ticket: req.body.ticket,
    price: req.body.price,   
    tags: req.body.tags.split(" ").map(e => e.trim()),
  });
  await event.save();
  req.flash('success', 'Successfully posted');
  res.redirect('/events');
}));

router.post('/:id/registers', needAuth, catchErrors(async (req, res, next) => {
  const user = req.user;
  const event = await Event.findById(req.params.id);

  if (!event) {
    req.flash('danger', 'Not exist event');
    return res.redirect('back');
  }

  var register = new Register({
    author: user._id,
    event: event._id,
    email: req.body.email
  });
  await register.save();
  event.numRegisters++;
  await event.save();

  req.flash('success', 'Successfully registered');
  res.redirect(`/events/${req.params.id}`);
}));

function validateForm(form, options) {
  var title = form.title || "";
  var location = form.location || "";
  var starts = form.starts || "";
  var ends = form.ends || "";
  var content = form.content || "";
  var organizer = form.organizer || "";
  var organizerdes = form.organizerdes || "";
  title = title.trim();
  location = location.trim();
  starts = starts.trim();
  ends = ends.trim();
  content = content.trim();
  organizer = organizer.trim();
  organizerdes = organizerdes.trim();

  if (!title) {
    return 'Title is required.';
  }

  if (!location) {
    return 'Location is required.';
  }

  if (!starts) {
    return 'Start is required.';
  }

  if (!ends) {
    return 'End is required.';
  }

  if(!content) {
    return 'Content is required.';
  }

  if(!organizer) {
    return 'Organizer Name is required.';
  }

  if(!organizerdes) {
    return 'Organizer Description is required.';
  }

  return null;
}


module.exports = router;
