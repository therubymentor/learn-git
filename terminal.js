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

  const ENTER_KEY = 13;
  const TAB_KEY    = 9;

  var lastStep     = 1;
  var lastURI      = "";
  var stepJSON     = {};
  var resultText   = "";
  var quitting     = null;
  var waitingFunc  = null;

  // Create terminal and cache DOM nodes;
  var container_ = document.getElementById(containerId);
  container_.insertAdjacentHTML('beforeEnd',
      ['<output></output>',
      '<div id="input-line" class="input-line">',
      '<div class="prompt">$ </div><div><input class="cmdline" autofocus /></div>',
      '</div>'].join(''));

  var cmdLine_ = container_.querySelector('#input-line .cmdline');
  var output_ = container_.querySelector('output');
  var interlace_ = document.querySelector('.interlace');

  window.addEventListener('load', function(e) {
    getData(1);
  }, false);

  window.addEventListener('click', function(e) {
    cmdLine_.focus();
  }, false);

  cmdLine_.addEventListener('click', inputTextClick_, false);
  cmdLine_.addEventListener('keydown', handleInput, false);

  function inputTextClick_(e) {
    this.value = this.value;
  }

  function getData(step) {
    var dataURI = 'data/steps/'+step;
    if (dataURI == lastURI) {
      quitting = true;
      return;
    }
    $.getJSON(dataURI+'/data.json', function(json){
      stepJSON = json['step'];
      $.get(dataURI+'/result.txt', function(text){
        resultText = text;
        printInstructions();
        lastURI = dataURI;
      });
    });
  }

  function printInstructions() {
    $.each(stepJSON['instructions'], function(i, v) {
      print(v);
    });
  }

  function handleInput(e) {
    switch(e.keyCode||e.which) {
      case TAB_KEY:
        e.preventDefault();
        break;
      case ENTER_KEY:
        if (waitingFunc != null) {
          waitingFunc();
          waitingFunc = null;
          break;
        }

        if (quitting) {
          clear(this);
          print("You have fallen into a dark hole. Feeling around you for a source of light your fingers fall upon a cold, scaly.....");
          print("YOU HAVE BEEN SLAIN BY A GRUE! Refresh to start over.");
          break;
        }

        var line = this.parentNode.parentNode.cloneNode(true);
        line.removeAttribute('id');
        line.classList.add('line');
        var input = line.querySelector('input.cmdline');
        input.autofocus = false;
        input.readOnly = true;
        output_.appendChild(line);

        if (stepJSON['expected'] === this.value) {
          lines = resultText.split("\n");
          $.each(lines, function(i, v) {
            print(v);
          });
          print("Press <enter> to continue.");
          doNext(function() {
            clear(this);
            getData(lastStep = lastStep + 1);
          });
        } else {
          print("nope");
        }
        this.value = '';
        break;
    };
  }

  function clear(input) {
    output_.innerHTML = '';
    input.value = '';
    document.documentElement.style.height = '100%';
    interlace_.style.height = '100%';
  }

  function print(html) {
    output_.insertAdjacentHTML('beforeEnd', ["<p>", html, "</p>"].join(''));
    cmdLine_.scrollIntoView();
  }

  function doNext(func) {
    waitingFunc = func;
  }
};
