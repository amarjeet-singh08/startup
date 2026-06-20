(function(){
"use strict";

var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   GOOGLE SHEETS SUBMISSION ENDPOINT
   ============================================================ */
var SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwP_3FjLiChVM7evoPs55MT_jtgm-zxOn6oKAw3UjtvNEXVdtLIOTFJ4vv0rh46cjKe/exec';

// Sends form data to the Google Apps Script Web App.
// Uses text/plain to avoid a CORS preflight (Apps Script doesn't handle OPTIONS requests).
// Returns a Promise that resolves once the request has been sent.
function submitToSheet(payload){
  if(!SHEET_ENDPOINT || SHEET_ENDPOINT.indexOf('script.google.com/macros/s/') === -1){
    return Promise.reject(new Error('Google Sheets endpoint is not configured.'));
  }

  // Google Apps Script web apps do not return browser-readable CORS headers.
  // no-cors allows this static website to send the POST request from
  // GitHub Pages, Live Server, localhost, or a directly opened HTML file.
  return fetch(SHEET_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-store',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
}

var MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function fileToPayload(file){
  if(!file) return Promise.resolve(null);
  if(file.size > MAX_UPLOAD_BYTES){
    return Promise.reject(new Error(file.name + ' is larger than 5 MB.'));
  }

  return new Promise(function(resolve, reject){
    var reader = new FileReader();
    reader.onload = function(){
      var value = String(reader.result || '');
      var comma = value.indexOf(',');
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: comma >= 0 ? value.slice(comma + 1) : value
      });
    };
    reader.onerror = function(){ reject(new Error('Could not read ' + file.name + '.')); };
    reader.readAsDataURL(file);
  });
}

function buildApplicationPayload(form){
  var payload = { formType: 'application' };
  var fileJobs = [];

  Array.prototype.forEach.call(form.elements, function(el){
    if(!el.name) return;

    if(el.type === 'checkbox'){
      payload[el.name] = el.checked;
      return;
    }

    if(el.type === 'file'){
      var file = el.files && el.files.length ? el.files[0] : null;
      payload[el.name] = file ? file.name : '';
      var targetKey = el.name === 'resume' ? 'resumeFile' : 'portfolioFile';
      fileJobs.push(fileToPayload(file).then(function(filePayload){
        payload[targetKey] = filePayload;
      }));
      return;
    }

    payload[el.name] = typeof el.value === 'string' ? el.value.trim() : el.value;
  });

  return Promise.all(fileJobs).then(function(){ return payload; });
}

/* ============================================================
   PRELOADER
   ============================================================ */
function runPreloader(){
  var fill = document.getElementById('preloaderFill');
  var pct = document.getElementById('preloaderPct');
  var preloader = document.getElementById('preloader');
  var p = 0;
  var duration = reducedMotion ? 1 : 1400;
  var start = performance.now();

  function tick(now){
    var elapsed = now - start;
    p = Math.min(100, Math.round((elapsed/duration)*100));
    fill.style.width = p + '%';
    pct.textContent = p + '%';
    if(p < 100){
      requestAnimationFrame(tick);
    } else {
      setTimeout(function(){
        preloader.classList.add('is-done');
        document.body.classList.add('preloader-done');
        startHeroSequence();
      }, 250);
    }
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   HERO ENTRANCE SEQUENCE
   ============================================================ */
function startHeroSequence(){
  var frame = document.getElementById('frame');
  frame.classList.add('is-in');

  var sequence = [
    { sel: '[data-anim="badge"]', delay: 250 },
    { sel: '.hero-mask', delay: 380, mask:true },
    { sel: '[data-anim="sub"]', delay: 560 },
    { sel: '[data-anim="desc"]', delay: 680 },
    { sel: '[data-anim="ctas"]', delay: 800 },
    { sel: '[data-anim="character"]', delay: 500 }
  ];

  sequence.forEach(function(step){
    var els = document.querySelectorAll(step.sel);
    els.forEach(function(el){
      setTimeout(function(){
        if(step.mask){
          el.style.transition = 'transform .9s cubic-bezier(.16,.84,.32,1)';
          el.style.transform = 'translateY(0)';
        } else {
          el.style.transition = 'opacity .8s cubic-bezier(.16,.84,.32,1), transform .8s cubic-bezier(.16,.84,.32,1)';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) scale(1)';
        }
      }, reducedMotion ? 0 : step.delay);
    });
  });

  // staggered capability cards
  var caps = document.querySelectorAll('.cap-card');
  caps.forEach(function(card, i){
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    setTimeout(function(){
      card.style.transition = 'opacity .6s cubic-bezier(.16,.84,.32,1), transform .6s cubic-bezier(.16,.84,.32,1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, reducedMotion ? 0 : 1000 + i*90);
  });
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
function setupCursor(){
  var cursor = document.getElementById('cxCursor');
  var ring = document.getElementById('cxRing');
  if(!cursor || window.matchMedia('(max-width:900px)').matches) return;

  var mx=0,my=0, rx=0,ry=0;
  window.addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx+'px'; cursor.style.top = my+'px';
  });

  function ringLoop(){
    rx += (mx-rx)*0.18; ry += (my-ry)*0.18;
    ring.style.left = rx+'px'; ring.style.top = ry+'px';
    requestAnimationFrame(ringLoop);
  }
  ringLoop();

  var hoverables = document.querySelectorAll('a, button, .cap-card, .role-card, .skill-node, input, select, textarea, .cert-card');
  hoverables.forEach(function(el){
    el.addEventListener('mouseenter', function(){ ring.classList.add('is-hover'); });
    el.addEventListener('mouseleave', function(){ ring.classList.remove('is-hover'); });
  });
}

/* ============================================================
   NAV BEHAVIOUR (scroll state, hide/show, active link)
   ============================================================ */
function setupNav(){
  var nav = document.getElementById('nav');
  var lastY = 0;
  var sections = document.querySelectorAll('main section[id], main .hero, .frame > main > section');
  var navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  var scrollContainer = window; // page scrolls normally

  function onScroll(){
    var y = window.scrollY;
    if(y > 40){ nav.classList.add('is-scrolled'); } else { nav.classList.remove('is-scrolled'); }

    if(y > lastY && y > 200){ nav.classList.add('is-hidden'); }
    else { nav.classList.remove('is-hidden'); }
    lastY = y;

    updateActiveSection();
  }

  var trackedSections = document.querySelectorAll('section[id]');
  function updateActiveSection(){
    var current = null;
    trackedSections.forEach(function(sec){
      var rect = sec.getBoundingClientRect();
      if(rect.top <= 140 && rect.bottom > 140){ current = sec.id; }
    });
    navLinks.forEach(function(a){
      var target = a.getAttribute('href').replace('#','');
      a.classList.toggle('is-active', target === current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive:true });

  // mobile burger
  var burger = document.getElementById('navBurger');
  var menu = document.getElementById('mobileMenu');
  burger.addEventListener('click', function(){
    var open = menu.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  menu.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      menu.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded','false');
    });
  });

  // smooth anchor scroll
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if(target){
        e.preventDefault();
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block:'start' });
      }
    });
  });
}

/* ============================================================
   GENERIC SCROLL REVEAL (IntersectionObserver)
   ============================================================ */
function setupReveal(){
  var targets = document.querySelectorAll('.project-card, .stat-card, .role-card, .cert-card, .culture-card, [data-reveal]');
  targets.forEach(function(el){ el.setAttribute('data-reveal',''); });

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.15 });

  document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
}

/* ============================================================
   CHARACTER PARALLAX (cursor + scroll)
   ============================================================ */
function setupCharacterParallax(){
  var stage = document.getElementById('charStage');
  var image = document.getElementById('heroCharacterImage');
  var chips = document.querySelectorAll('.chip');
  if(!stage || !image || reducedMotion) return;

  var targetX=0, targetY=0, curX=0, curY=0;

  stage.addEventListener('mousemove', function(e){
    var rect = stage.getBoundingClientRect();
    var px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    var py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    targetX = (px / 100 - 0.5) * 2;
    targetY = (py / 100 - 0.5) * 2;
    stage.style.setProperty('--glow-x', px + '%');
    stage.style.setProperty('--glow-y', py + '%');
  });

  stage.addEventListener('mouseleave', function(){
    targetX=0;
    targetY=0;
    stage.style.setProperty('--glow-x', '50%');
    stage.style.setProperty('--glow-y', '50%');
  });

  function loop(){
    curX += (targetX-curX)*0.075;
    curY += (targetY-curY)*0.075;
    image.style.transform = 'translate3d('+(curX*8)+'px,'+(curY*8)+'px,0) rotateX('+(-curY*4)+'deg) rotateY('+(curX*5)+'deg)';
    chips.forEach(function(chip){
      var depth = parseFloat(chip.getAttribute('data-depth')) || 1;
      chip.style.transform = 'translate3d('+(curX*11*depth)+'px,'+(curY*11*depth)+'px,0)';
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ============================================================
   CAPABILITY CARD SPOTLIGHT
   ============================================================ */
function setupCapSpotlight(){
  document.querySelectorAll('.cap-card').forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX-rect.left)+'px');
      card.style.setProperty('--my', (e.clientY-rect.top)+'px');
    });
  });
}

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function setupCounters(){
  var els = document.querySelectorAll('.stat-number');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        animateCount(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold:0.5 });
  els.forEach(function(el){ io.observe(el); });

  function animateCount(el){
    var target = parseInt(el.getAttribute('data-count'),10) || 0;
    var dur = reducedMotion ? 0 : 900;
    var startTime = performance.now();
    function step(now){
      var t = dur === 0 ? 1 : Math.min(1,(now-startTime)/dur);
      el.textContent = Math.round(target * t);
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
}

/* ============================================================
   ROADMAP SCROLL PROGRESS
   ============================================================ */
function setupRoadmap(){
  var roadmap = document.getElementById('roadmap');
  var progressLine = document.getElementById('roadmapProgress');
  var steps = document.querySelectorAll('.road-step');
  if(!roadmap) return;

  function update(){
    var rect = roadmap.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height + vh*0.5;
    var passed = vh*0.75 - rect.top;
    var progress = Math.min(1, Math.max(0, passed/total));

    progressLine.setAttribute('x2', 1200*progress);

    var activeCount = Math.round(progress * steps.length);
    steps.forEach(function(step, i){
      step.classList.toggle('is-active', i < activeCount);
    });
  }
  window.addEventListener('scroll', update, { passive:true });
  update();
}

/* ============================================================
   SKILLS UNIVERSE
   ============================================================ */
var techSkills = [
  { name:'Python', desc:'Used to build the Vehicle Inheritance System and core programming foundations.' },
  { name:'Problem-Solving', desc:'Applied across engineering coursework and every project tackled so far.' },
  { name:'OOP Fundamentals', desc:'Classes, inheritance, and structuring logic — demonstrated in Python projects.' },
  { name:'Microsoft Excel', desc:'Certified — used for data organisation, formulas, and reporting.' },
  { name:'Power BI', desc:'Certified — built an interactive dashboard to visualise and interpret datasets.' },
  { name:'Data Analysis', desc:'Foundation in turning raw datasets into structured, readable insight.' },
  { name:'Google Ads', desc:'Certified — campaign structure and audience targeting fundamentals.' },
  { name:'Digital Marketing', desc:'Fundamentals covering content, audience strategy, and analytics.' },
  { name:'Canva', desc:'Certified in marketing a new business — used for visual and brand content.' },
  { name:'Digital Technologies', desc:'Broad familiarity with the tools modern digital products are built on.' }
];
var softSkills = [
  { name:'Communication', desc:'Clear, direct communication — core to how the team is meant to work.' },
  { name:'Teamwork', desc:'Built through collaborative coursework and early team-building efforts.' },
  { name:'Problem-Solving', desc:'A recurring thread across engineering study and personal projects.' },
  { name:'Adaptability', desc:'Comfortable moving between technical and creative problem spaces.' },
  { name:'Learning Mindset', desc:'Actively pursuing certifications across data, marketing, and design tools.' },
  { name:'Collaboration', desc:'The foundation for bringing a multidisciplinary team together.' }
];

function buildSkillCloud(containerId, list){
  var container = document.getElementById(containerId);
  list.forEach(function(skill){
    var node = document.createElement('button');
    node.className = 'skill-node';
    node.type = 'button';
    node.textContent = skill.name;
    node.addEventListener('mouseenter', function(){ showSkillPopover(skill); });
    node.addEventListener('focus', function(){ showSkillPopover(skill); });
    node.addEventListener('click', function(){ showSkillPopover(skill); });
    container.appendChild(node);
  });
}

function showSkillPopover(skill){
  var pop = document.getElementById('skillPopover');
  document.getElementById('skillPopTitle').textContent = skill.name;
  document.getElementById('skillPopDesc').textContent = skill.desc;
  pop.classList.add('is-visible');
}

function setupSkills(){
  buildSkillCloud('techCloud', techSkills);
  buildSkillCloud('softCloud', softSkills);
}

/* ============================================================
   PROJECT CASE STUDY EXPAND
   ============================================================ */
function setupProjects(){
  document.querySelectorAll('[data-toggle-extra]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var card = btn.closest('.project-card');
      var expanded = card.classList.toggle('is-expanded');
      btn.textContent = expanded ? 'Hide Case Study' : 'View Case Study';
    });
  });
}

/* ============================================================
   MULTI-STEP APPLICATION FORM
   ============================================================ */
function setupApplicationForm(){
  var form = document.getElementById('applicationForm');
  if(!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.form-step'));
  var fpSteps = Array.prototype.slice.call(document.querySelectorAll('.fp-step'));
  var prevBtn = document.getElementById('formPrev');
  var nextBtn = document.getElementById('formNext');
  var submitBtn = document.getElementById('formSubmit');
  var autosaveLabel = document.getElementById('formAutosave');
  var successBox = document.getElementById('formSuccess');
  var current = 0;
  var STORAGE = {}; // in-memory only — no browser storage per artifact rules

  function showStep(i){
    steps.forEach(function(s, idx){ s.classList.toggle('is-active', idx===i); });
    fpSteps.forEach(function(fp, idx){
      fp.classList.toggle('is-active', idx===i);
      fp.classList.toggle('is-done', idx<i);
    });
    prevBtn.disabled = (i===0);
    nextBtn.hidden = (i === steps.length-1);
    submitBtn.hidden = (i !== steps.length-1);
  }

  function validateStep(i){
    var step = steps[i];
    var fields = step.querySelectorAll('input[required], select[required], textarea[required]');
    var valid = true;

    fields.forEach(function(f){
      var wrap = f.closest('.field');
      var errorEl = wrap ? wrap.querySelector('.field-error') : null;
      var ok = f.checkValidity() && f.value.trim() !== '';
      if(!ok){
        valid = false;
        if(wrap) wrap.classList.add('has-error');
        if(errorEl) errorEl.textContent = fieldErrorMessage(f);
      } else {
        if(wrap) wrap.classList.remove('has-error');
        if(errorEl) errorEl.textContent = '';
      }
    });

    // consent checkboxes on final step
    if(step.querySelectorAll('input[type="checkbox"][required]').length){
      var checks = step.querySelectorAll('input[type="checkbox"][required]');
      var allChecked = Array.prototype.every.call(checks, function(c){ return c.checked; });
      var consentError = step.querySelector('.field-error--consent');
      if(!allChecked){
        valid = false;
        if(consentError) consentError.textContent = 'Please confirm all three statements to submit.';
      } else if(consentError){
        consentError.textContent = '';
      }
    }

    return valid;
  }

  function fieldErrorMessage(f){
    if(f.validity.valueMissing) return 'This field is required.';
    if(f.validity.typeMismatch && f.type === 'email') return 'Enter a valid email address.';
    if(f.validity.typeMismatch && f.type === 'url') return 'Enter a valid URL.';
    return 'Please check this field.';
  }

  nextBtn.addEventListener('click', function(){
    if(!validateStep(current)) return;
    current = Math.min(steps.length-1, current+1);
    showStep(current);
    autosave();
    form.closest('.form-shell').scrollIntoView({ behavior: reducedMotion?'auto':'smooth', block:'start' });
  });

  prevBtn.addEventListener('click', function(){
    current = Math.max(0, current-1);
    showStep(current);
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if(!validateStep(current)) return;

    var status = document.getElementById('applicationStatus');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    form.setAttribute('aria-busy','true');
    if(status){
      status.className = 'form-submit-status';
      status.textContent = 'Uploading files and saving your application…';
    }

    buildApplicationPayload(form)
      .then(function(payload){ return submitToSheet(payload); })
      .then(function(){
        if(status){
          status.className = 'form-submit-status is-success';
          status.textContent = 'Application saved successfully.';
        }
        showSuccess();
      })
      .catch(function(error){
        console.error('Application submission error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Application';
        form.removeAttribute('aria-busy');
        if(status){
          status.className = 'form-submit-status is-error';
          status.textContent = error.message || 'Application could not be submitted. Please try again.';
        }
      });
  });

  function showSuccess(){
    form.removeAttribute('aria-busy');
    form.hidden = true;
    document.querySelector('.form-progress').hidden = true;
    successBox.hidden = false;
    launchConfetti(successBox.querySelector('.success-burst'));
  }

  // autosave (in-memory) on input
  var autosaveTimer;
  form.addEventListener('input', autosave);
  function autosave(){
    clearTimeout(autosaveTimer);
    autosaveLabel.classList.remove('is-visible');
    autosaveTimer = setTimeout(function(){
      // store form values in memory object (no browser storage)
      Array.prototype.forEach.call(form.elements, function(el){
        if(el.name) STORAGE[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      autosaveLabel.textContent = 'Draft saved';
      autosaveLabel.classList.add('is-visible');
      setTimeout(function(){ autosaveLabel.classList.remove('is-visible'); }, 1800);
    }, 500);
  }

  showStep(0);
}

function launchConfetti(container){
  if(!container || reducedMotion) return;
  var colors = ['#075CFF','#34D6FF','#0037B8','#FF9A3D'];
  for(var i=0;i<24;i++){
    var c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = (45 + Math.random()*10) + '%';
    c.style.background = colors[i % colors.length];
    c.style.animation = 'confettiFall '+(0.9+Math.random()*0.6)+'s ease-out forwards';
    c.style.animationDelay = (Math.random()*0.2)+'s';
    var dx = (Math.random()-0.5)*240;
    c.style.setProperty('--dx', dx+'px');
    container.appendChild(c);
  }
  if(!document.getElementById('confettiKeyframes')){
    var style = document.createElement('style');
    style.id = 'confettiKeyframes';
    style.textContent = '@keyframes confettiFall{0%{opacity:1;transform:translate(0,0) rotate(0deg);}100%{opacity:0;transform:translate(var(--dx),160px) rotate(280deg);}}';
    document.head.appendChild(style);
  }
}

/* ============================================================
   CONTACT FORM + COPY EMAIL
   ============================================================ */
function setupContact(){
  var copyBtn = document.getElementById('copyEmailBtn');
  var copyStatus = document.getElementById('copyStatus');
  if(copyBtn){
    copyBtn.addEventListener('click', function(){
      var email = 'amarjeet.s2908@gmail.com';
      if(navigator.clipboard){
        navigator.clipboard.writeText(email).then(function(){
          flashCopied();
        }).catch(function(){ flashCopied(); });
      } else {
        flashCopied();
      }
    });
  }
  function flashCopied(){
    copyStatus.textContent = 'Copied';
    setTimeout(function(){ copyStatus.textContent = 'Copy'; }, 1800);
  }

  var contactForm = document.getElementById('contactForm');
  var confirm = document.getElementById('contactConfirm');
  if(contactForm){
    contactForm.addEventListener('submit', function(e){
      e.preventDefault();
      if(!contactForm.checkValidity()){ contactForm.reportValidity(); return; }

      var submitBtn = contactForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var payload = {
        formType: 'contact',
        name: contactForm.elements['name'].value.trim(),
        email: contactForm.elements['email'].value.trim().toLowerCase(),
        phone: contactForm.elements['phone'].value.trim(),
        message: contactForm.elements['message'].value.trim()
      };

      confirm.textContent = 'Saving your message…';

      submitToSheet(payload)
        .then(function(){ onContactSent(); })
        .catch(function(error){
          console.error('Contact form error:', error);
          confirm.textContent = error.message || 'Message could not be sent. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        });

      function onContactSent(){
        confirm.textContent = 'Message saved. Thanks for reaching out — I\'ll get back to you soon.';
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        setTimeout(function(){ confirm.textContent=''; }, 5000);
      }
    });
  }
}

/* ============================================================
   ROLE CARD APPLY → JUMP TO FORM + PRESELECT
   ============================================================ */
function setupRoleCards(){
  document.querySelectorAll('.role-card').forEach(function(card){
    var roleName = card.querySelector('h3').textContent.trim();
    var applyLink = card.querySelector('.role-apply');
    if(applyLink){
      applyLink.addEventListener('click', function(e){
        e.preventDefault();
        var select = document.querySelector('select[name="preferredRole"]');
        if(select){
          Array.prototype.forEach.call(select.options, function(opt){
            if(opt.text.trim() === roleName){ select.value = opt.value; }
          });
        }
        document.getElementById('apply').scrollIntoView({ behavior: reducedMotion?'auto':'smooth' });
      });
    }
  });
}

/* ============================================================
   SOUND TOGGLE (optional interface sounds)
   ============================================================ */
function setupSound(){
  var btn = document.getElementById('soundToggle');
  var icon = document.getElementById('soundIcon');
  var enabled = false;
  var audioCtx;

  function beep(freq, dur){
    if(!enabled) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.04;
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur);
    } catch(e){}
  }

  btn.addEventListener('click', function(){
    enabled = !enabled;
    btn.setAttribute('aria-pressed', enabled);
    icon.innerHTML = enabled
      ? '<path d="M3 10v4h4l5 5V5L7 10H3z" fill="currentColor"/><path d="M16 8a6 6 0 010 8" stroke="currentColor" stroke-width="1.6" fill="none"/>'
      : '<path d="M3 10v4h4l5 5V5L7 10H3z" fill="currentColor"/><line x1="16" y1="9" x2="21" y2="15" stroke="currentColor" stroke-width="1.6"/><line x1="21" y1="9" x2="16" y2="15" stroke="currentColor" stroke-width="1.6"/>';
    beep(enabled ? 600 : 300, 0.12);
  });

  document.querySelectorAll('.btn, .cap-card, .role-card').forEach(function(el){
    el.addEventListener('mouseenter', function(){ beep(440, 0.04); });
  });
}
function setupStartDateRestriction() {
  var dateInput = document.getElementById('startDate');

  if (!dateInput) return;

  var today = new Date();

  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, '0');
  var day = String(today.getDate()).padStart(2, '0');

  var todayString = year + '-' + month + '-' + day;

  // Prevent selecting any date before today.
  dateInput.min = todayString;

  dateInput.addEventListener('change', function () {
    if (dateInput.value && dateInput.value < todayString) {
      dateInput.value = '';
      dateInput.setCustomValidity(
        'Please select today or a future date.'
      );
      dateInput.reportValidity();
    } else {
      dateInput.setCustomValidity('');
    }
  });
}
function setupIdentityValidation() {
  var emailInputs = document.querySelectorAll('input[type="email"]');
  var phoneInputs = document.querySelectorAll('input[type="tel"]');

  var emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var phonePattern = /^[6-9][0-9]{9}$/;

  emailInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      var value = input.value.trim();

      if (!value) {
        input.setCustomValidity('');
        return;
      }

      if (!emailPattern.test(value)) {
        input.setCustomValidity(
          'Please enter a valid email address, such as name@example.com.'
        );
      } else {
        input.setCustomValidity('');
      }
    });

    input.addEventListener('blur', function () {
      input.value = input.value.trim().toLowerCase();
    });
  });

  phoneInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      // Remove spaces, letters, symbols and country-code characters.
      input.value = input.value.replace(/\D/g, '').slice(0, 10);

      if (!input.value) {
        input.setCustomValidity('');
        return;
      }

      if (!phonePattern.test(input.value)) {
        input.setCustomValidity(
          'Enter a valid 10-digit Indian mobile number beginning with 6, 7, 8 or 9.'
        );
      } else {
        input.setCustomValidity('');
      }
    });
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function(){
  setupIdentityValidation();
  setupStartDateRestriction();
  setupCursor();
  setupNav();
  setupReveal();
  setupCharacterParallax();
  setupCapSpotlight();
  setupCounters();
  setupRoadmap();
  setupSkills();
  setupProjects();
  setupApplicationForm();
  setupContact();
  setupRoleCards();
  setupSound();
  runPreloader();
});

})();
