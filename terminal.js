var util = util || {};
util.toArray = function(list) {
  return Array.prototype.slice.call(list || [], 0);
};

// Cross-browser document height
util.getDocHeight = function() {
  var d = document;
  return Math.max(
      Math.max(d.body.scrollHeight, d.documentElement.scrollHeight),
      Math.max(d.body.offsetHeight, d.documentElement.offsetHeight),
      Math.max(d.body.clientHeight, d.documentElement.clientHeight)
      );
};

const WINDOW_URL  = window.URL || window.webkitURL;

var Terminal = Terminal || function(containerId) {
  window.URL = WINDOW_URL;

  const CMDS_ = [
    'clear', 'help', 'restart'
  ];

  const ENTER_KEY = 13;
  const TAB_KEY    = 9;

  var timer_ = null;
  var quitting_ = false;

  // Create terminal and cache DOM nodes;
  var container_ = document.getElementById(containerId);
  container_.insertAdjacentHTML('beforeEnd',
      ['<output></output>',
      '<div id="input-line" class="input-line">',
      '<div class="prompt">$&gt;</div><div><input class="cmdline" autofocus /></div>',
      '</div>'].join(''));

  var cmdLine_ = container_.querySelector('#input-line .cmdline');
  var output_ = container_.querySelector('output');
  var interlace_ = document.querySelector('.interlace');

  // MOTD
  output('<p>Welcome to the '+ document.title + '!</p>');
  output('<p>Git is a version control system that is great for saving your ass '+
      'when you screw up. And you will screw up! I honestly don\'t know how '+
      'I managed without it. And today you get to start learning everything '+
      'you will ever need to know about Git. It is actually pretty easy, so '+
      'let\'s dig in!</p>');
  output('<p>You won\'t need to install anything special to do this tutorial as '+
      'it is more or less a perfect simulation of Git and a specific Git '+
      'workflow, designed to make your life while working with a team easy!</p>');
  output('But enough bullshit! Type `cd ~/dev/proj_1` to change into the directory '+
      'you will be working in:</p>');

  window.addEventListener('click', function(e) {
    cmdLine_.focus();
  }, false);

  cmdLine_.addEventListener('click', inputTextClick_, false);
  cmdLine_.addEventListener('keydown', handleInput, false);

  window.addEventListener('beforeunload', function(e) {
    return "Don't leave me baby... I'll change!";
  }, false);

  function inputTextClick_(e) {
    this.value = this.value;
  }

  function handleInput(e) {
    switch(e.keyCode||e.which) {
      case TAB_KEY:
        e.preventDefault();
        break;
      case ENTER_KEY:
        var line = this.parentNode.parentNode.cloneNode(true);
        line.removeAttribute('id');
        line.classList.add('line');
        var input = line.querySelector('input.cmdline');
        input.autofocus = false;
        input.readOnly = true;
        output_.appendChild(line);

        if (this.value && this.value.trim()) {
          var args = this.value.split(' ').filter(function(val, i) {
            return val;
          });
          var cmd = args[0].toLowerCase();
          args = args.splice(1);
        }
        this.value = '';

        // DO SOME SHIT
        // $.getJSON("data/steps/1.json", function( data ) {});
        break;
    };
  }

  function clear_(input) {
    output_.innerHTML = '';
    input.value = '';
    document.documentElement.style.height = '100%';
    interlace_.style.height = '100%';
  }

  function output(html) {
    output_.insertAdjacentHTML('beforeEnd', html);
    //output_.scrollIntoView();
    cmdLine_.scrollIntoView();
  }

  return {
    output: output,
    getCmdLine: function() { return cmdLine_; }
  }
};
