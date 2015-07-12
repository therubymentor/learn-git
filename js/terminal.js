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

  const ENTER_KEY     = 13;
  const TAB_KEY       = 9;
  const UP_ARROW_KEY  = 38;
  const DOWN_ARROW_KEY = 40;

  var lastStep     = 1;
  var lastURI      = "";
  var resultText   = "";
  var quitting     = null;
  var waitingFunc  = null;
  var histPos      = 0;
  var cmdHistory   = [''];
  var stepJSON     = {};

  // Create terminal and cache DOM nodes;
  var container = document.getElementById(containerId);
  container.insertAdjacentHTML('beforeEnd',
      ['<output></output>',
      '<div id="input-line" class="input-line">',
      '<div class="prompt">$ </div><div><input class="cmdline" autofocus /></div>',
      '</div>'].join(''));

  var cmdLine   = container.querySelector('#input-line .cmdline');
  var output    = container.querySelector('output');
  var interlace = document.querySelector('.interlace');

  window.addEventListener('load', function(e) {
    getData(1);
  }, false);

  window.addEventListener('click', function(e) {
    cmdLine.focus();
  }, false);

  cmdLine.addEventListener('click', inputTextClick, false);
  cmdLine.addEventListener('keydown', handleInput, false);
  cmdLine.addEventListener('keydown', scanHistory, false);

  function inputTextClick(e) {
    this.value = this.value;
  }

  function getData(step) {
    var dataURI = 'data/steps/'+step;
    console.debug(dataURI);
    $.getJSON(dataURI+'/data.json', {}).done(function(json){
      stepJSON = json['step'];
      $.get(dataURI+'/result.txt', {}).done(function(text){
        resultText = text;
        printInstructions();
        lastURI = dataURI;
      });
    }).fail(function() {
      quitting = true;
    });
  }

  function printInstructions() {
    $.each(stepJSON['instructions'], function(i, v) {
      print(v);
    });
  }

  function handleInput(e) {
    switch(e.keyCode||e.which) {
      case UP_ARROW_KEY:
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
        output.appendChild(line);

        if (stepJSON['expected'] === this.value) {
          cmdHistory.push(stepJSON['expected']);
          console.debug(cmdHistory);

          pre(resultText);
          print(stepJSON['hint']);
          print("Press <enter> to continue.");
          doNext(function() {
            clear(this);
            getData(lastStep = lastStep + 1);
          });
        } else {
          print("Wat?");
        }
        this.value = '';
        break;
    };
  }

  function scanHistory(e) {
    if (cmdHistory.length) {
      if (e.keyCode == DOWN_ARROW_KEY) {
        histPos--;
        if (histPos < 0) {
          histPos = cmdHistory.length-1;
        }
      } else if (e.keyCode == UP_ARROW_KEY) {
        histPos++;
        if (histPos > cmdHistory.length-1) {
          histPos = 0;
        }
      }

      if (e.keyCode == UP_ARROW_KEY || e.keyCode == DOWN_ARROW_KEY) {
        this.value = cmdHistory[histPos];
      }
    }
  }

  function clear(input) {
    output.innerHTML = '';
    input.value = '';
    document.documentElement.style.height = '100%';
    interlace.style.height = '100%';
  }

  function print(html) {
    output.insertAdjacentHTML('beforeEnd', ["<p>", html, "</p>"].join(''));
    cmdLine.scrollIntoView();
  }

  function pre(html) {
    output.insertAdjacentHTML('beforeEnd', ["<pre>", html, "</pre>"].join(''));
    cmdLine.scrollIntoView();
  }

  function doNext(func) {
    waitingFunc = func;
  }
};
