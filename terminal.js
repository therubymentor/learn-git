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


var Terminal = Terminal || function(containerId) {
  window.URL = window.URL || window.webkitURL;
  window.requestFileSystem = window.requestFileSystem ||
    window.webkitRequestFileSystem;

  const VERSION_ = '1.0.0';
  const CMDS_ = [
    'clear', 'help', 'restart'
  ];

  var fs_ = null;
  var cwd_ = null;
  var history_ = [];
  var histpos_ = 0;
  var histtemp_ = 0;

  var timer_ = null;
  var fsn_ = null;
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

  output_.addEventListener('click', function(e) {
    var el = e.target;
    if (el.classList.contains('file') || el.classList.contains('folder')) {
      cmdLine_.value += ' ' + el.textContent;
    }
  }, false);

  window.addEventListener('click', function(e) {
    cmdLine_.focus();
  }, false);

  // Always force text cursor to end of input line.
  cmdLine_.addEventListener('click', inputTextClick_, false);

  // Handle up/down key presses for shell history and enter for new command.
  cmdLine_.addEventListener('keyup', historyHandler_, false); // keyup needed for input blinker to appear at end of input.
  cmdLine_.addEventListener('keydown', processNewCommand_, false);

  window.addEventListener('beforeunload', function(e) {
    return "Don't leave me baby... I'll change!";
  }, false);

  function inputTextClick_(e) {
    this.value = this.value;
  }

  function selectFile_(el) {
    alert(el)
  }

  function historyHandler_(e) { // Tab needs to be keydown.
    if (history_.length) {
      if (e.keyCode == 38 || e.keyCode == 40) {
        if (history_[histpos_]) {
          history_[histpos_] = this.value;
        } else {
          histtemp_ = this.value;
        }
      }

      if (e.keyCode == 38) { // up
        histpos_--;
        if (histpos_ < 0) {
          histpos_ = 0;
        }
      } else if (e.keyCode == 40) { // down
        histpos_++;
        if (histpos_ > history_.length) {
          histpos_ = history_.length;
        }
      }

      if (e.keyCode == 38 || e.keyCode == 40) {
        this.value = history_[histpos_] ? history_[histpos_] : histtemp_;
        this.value = this.value; // Sets cursor to end of input.
      }
    }
  }

  function processNewCommand_(e) {
    if (e.keyCode == 9) { // Tab
      e.preventDefault();
    } else if (e.keyCode == 13) { // enter
      // Save shell history.
      if (this.value) {
        history_[history_.length] = this.value;
        histpos_ = history_.length;
      }

      // Duplicate current input and append to output section.
      var line = this.parentNode.parentNode.cloneNode(true);
      line.removeAttribute('id')
        line.classList.add('line');
      var input = line.querySelector('input.cmdline');
      input.autofocus = false;
      input.readOnly = true;
      output_.appendChild(line);

      // Parse out command, args, and trim off whitespace.
      if (this.value && this.value.trim()) {
        var args = this.value.split(' ').filter(function(val, i) {
          return val;
        });
        var cmd = args[0].toLowerCase();
        args = args.splice(1);
      }

      if (quitting_ == true) {
        if (cmd[0] == "y") {
          output('<p>Restarting..</p>');
          setTimeout(function() {
            location.reload();
          }, 3000);
        } else {
          output("<p>Cancelling restart..</p>");
        }
        this.value = '';
        return;
      }

      switch (cmd) {
        case 'restart':
          output('<p>Are you sure you want to start the tutorial over?</p>' +
                 '<p>You will lose all history: (y/n)</p>');
          quitting_ = true
          break;
        case 'clear':
          clear_(this);
          return;
        case 'help':
          output('<div class="ls-files">' + CMDS_.join('<br>') + '</div>');
          break;
        default:
          if (cmd) {
            output(cmd + ': command not found');
          }
      };
      this.value = '';
    }
  }

  function formatColumns_(entries) {
    var maxName = entries[0].name;
    util.toArray(entries).forEach(function(entry, i) {
      if (entry.name.length > maxName.length) {
        maxName = entry.name;
      }
    });

    // If we have 3 or less entries, shorten the output container's height.
    // 15px height with a monospace font-size of ~12px;
    var height = entries.length == 1 ? 'height: ' + (entries.length * 30) + 'px;' :
      entries.length <= 3 ? 'height: ' + (entries.length * 18) + 'px;' : '';

    // ~12px monospace font yields ~8px screen width.
    var colWidth = maxName.length * 16;//;8;

    return ['<div class="ls-files" style="-webkit-column-width:',
            colWidth, 'px;', height, '">'];
  }

  function invalidOpForEntryType_(e, cmd, dest) {
    if (e.code == FileError.NOT_FOUND_ERR) {
      output(cmd + ': ' + dest + ': No such file or directory<br>');
    } else if (e.code == FileError.INVALID_STATE_ERR) {
      output(cmd + ': ' + dest + ': Not a directory<br>');
    } else if (e.code == FileError.INVALID_MODIFICATION_ERR) {
      output(cmd + ': ' + dest + ': File already exists<br>');
    } else {
      errorHandler_(e);
    }
  }

  function errorHandler_(e) {
    var msg = '';
    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR';
        break;
      case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
      default:
        msg = 'Unknown Error';
        break;
    };
    output('<div>Error: ' + msg + '</div>');
  }

  function createDir_(rootDirEntry, folders, opt_errorCallback) {
    var errorCallback = opt_errorCallback || errorHandler_;

    rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {

      // Recursively add the new subfolder if we still have a subfolder to create.
      if (folders.length) {
        createDir_(dirEntry, folders.slice(1));
      }
    }, errorCallback);
  }

  function open_(cmd, path, successCallback) {
    if (!fs_) {
      return;
    }

    cwd_.getFile(path, {}, successCallback, function(e) {
      if (e.code == FileError.NOT_FOUND_ERR) {
        output(cmd + ': ' + path + ': No such file or directory<br>');
      }
    });
  }

  function read_(cmd, path, successCallback) {
    if (!fs_) {
      return;
    }

    cwd_.getFile(path, {}, function(fileEntry) {
      fileEntry.file(function(file) {
        var reader = new FileReader();

        reader.onloadend = function(e) {
          successCallback(this.result);
        };

        reader.readAsText(file);
      }, errorHandler_);
    }, function(e) {
      if (e.code == FileError.INVALID_STATE_ERR) {
        output(cmd + ': ' + path + ': is a directory<br>');
      } else if (e.code == FileError.NOT_FOUND_ERR) {
        output(cmd + ': ' + path + ': No such file or directory<br>');
      }
    });
  }

  function ls_(successCallback) {
    if (!fs_) {
      return;
    }

    // Read contents of current working directory. According to spec, need to
    // keep calling readEntries() until length of result array is 0. We're
    // guarenteed the same entry won't be returned again.
    var entries = [];
    var reader = cwd_.createReader();

    var readEntries = function() {
      reader.readEntries(function(results) {
        if (!results.length) {
          entries = entries.sort();
          successCallback(entries);
        } else {
          entries = entries.concat(util.toArray(results));
          readEntries();
        }
      }, errorHandler_);
    };

    readEntries();
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
    initFS: function(persistent, size) {
      output('<div>Welcome to the ' + document.title + '</div>');
      output('<p>Type "help" if you get lost.</p>');

      if (!!!window.requestFileSystem) {
        output('<div>Sorry! The FileSystem APIs are not available in your browser. Switch to Chrome or Firefox!</div>');
        return;
      }

      var type = persistent ? window.PERSISTENT : window.TEMPORARY;
      window.requestFileSystem(type, size, function(filesystem) {
        fs_ = filesystem;
        cwd_ = fs_.root;
        type_ = type;
        size_ = size;
      }, errorHandler_);
    },
    output: output,
    getCmdLine: function() { return cmdLine_; },
    addDroppedFiles: function(files) {
      util.toArray(files).forEach(function(file, i) {
        cwd_.getFile(file.name, {create: true, exclusive: true}, function(fileEntry) {

          // Tell FSN visualizer we've added a file.
          if (fsn_) {
            fsn_.contentWindow.postMessage({cmd: 'touch', data: file.name}, location.origin);
          }

          fileEntry.createWriter(function(fileWriter) {
            fileWriter.write(file);
          }, errorHandler_);
        }, errorHandler_);
      });
    },
    selectFile: selectFile_
  }
};

