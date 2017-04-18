(function() {
  var $audioInLevel, $audioInSelect, $bufferSize, $cancel, $dateTime, $echoCancellation, $encoding, $encodingOption, $encodingProcess, $modalError, $modalLoading, $modalProgress, $record, $recording, $recordingList, $reportInterval, $testToneLevel, $timeDisplay, $timeLimit, BUFFER_SIZE, ENCODING_OPTION, MP3_BIT_RATE, OGG_KBPS, OGG_QUALITY, URL, audioContext, audioIn, audioInLevel, audioRecorder, defaultBufSz, disableControlsOnRecord, encodingProcess, iDefBufSz, minSecStr, mixer, onChangeAudioIn, onError, onGotAudioIn, onGotDevices, optionValue, plural, progressComplete, saveRecording, setProgress, startRecording, stopRecording, testTone, testToneLevel, updateBufferSizeText, updateDateTime;

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  URL = window.URL || window.webkitURL;

  audioContext = new AudioContext;

  if (audioContext.createScriptProcessor == null) {
    audioContext.createScriptProcessor = audioContext.createJavaScriptNode;
  }

  $recording = $('#recording');

  $timeDisplay = $('#time-display');

  $record = $('#record');

  $cancel = $('#cancel');

  $dateTime = $('#date-time');

  $recordingList = $('#recording-list');

  audioInLevel = audioContext.createGain();

  audioInLevel.gain.value = 1;

  mixer = audioContext.createGain();

  audioIn = void 0;

  audioInLevel.connect(mixer);

  // mixer.connect(audioContext.destination);

  audioRecorder = new WebAudioRecorder(mixer, {
    workerDir: 'js/',
    onEncoderLoading: function(recorder, encoding) {
      console.log("loading encoder");
    },
    encoding : "mp3"
  });

  onGotDevices = function(devInfos) {
    var deviceId, constraint;
    console.log(devInfos);
    //deviceId = devInfos[0].deviceId;
    deviceId = 'default-audio-input';
    if (deviceId === 'default-audio-input') {
      deviceId = void 0;
    }
    if (navigator.webkitGetUserMedia !== undefined) {
           constraint = {
             video: false,
             audio: {
               optional: [
                   {sourceId:deviceId},
                   {googAutoGainControl: false},
                   {googAutoGainControl2: false},
                   {echoCancellation: false},
                   {googEchoCancellation: false},
                   {googEchoCancellation2: false},
                   {googDAEchoCancellation: false},
                   {googNoiseSuppression: false},
                   {googNoiseSuppression2: false},
                   {googHighpassFilter: false},
                   {googTypingNoiseDetection: false},
                   {googAudioMirroring: false}
                 ]
               }
             }
           }
         else if (navigator.mozGetUserMedia !== undefined) {
           constraint = {
             video: false,
             audio: {
               deviceId: deviceId ? { exact: deviceId } : void 0,
               echoCancellation: false,
               mozAutoGainControl: false
               //mozNoiseSuppression: false
               }
             }

          }
         else {
           constraint = {
             video: false,
             audio: {
               deviceId: deviceId ? {exact: deviceId} : void 0,
               echoCancellation: false
             }
           }
         }
    if ((navigator.mediaDevices != null) && (navigator.mediaDevices.getUserMedia != null)) {
         navigator.mediaDevices.getUserMedia(constraint).then(onGotAudioIn)["catch"](function(err) {
           console.error("Could not get audio media device: " + err);
         });
     } else {
       navigator.getUserMedia(constraint, onGotAudioIn, function() {
         console.error("Could not get audio media device: " + err);
       });
   }
  };

  if ((navigator.mediaDevices != null) && (navigator.mediaDevices.enumerateDevices != null)) {
    navigator.mediaDevices.enumerateDevices().then(onGotDevices)["catch"](function(err) {
      return console.error("Could not enumerate audio devices: " + err);
    });
  } else {
    console.log("loaded")
  }

  onGotAudioIn = function(stream) {
    if (audioIn != null) {
      audioIn.disconnect();
    }
    audioIn = audioContext.createMediaStreamSource(stream);
    audioIn.connect(audioInLevel);
    return ;
  };

  MP3_BIT_RATE = [64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

  ENCODING_OPTION = {
    mp3: {
      label: 'Bit rate',
      hidden: false,
      max: MP3_BIT_RATE.length - 1,
      text: function(val) {
        return "" + MP3_BIT_RATE[val] + "kbps";
      }
    }
  };

  optionValue = {
    mp3: 9
  };

  encodingProcess = 'background';

  defaultBufSz = (function() {
    var processor;
    processor = audioContext.createScriptProcessor(void 0, 2, 2);
    return processor.bufferSize;
  })();

  BUFFER_SIZE = [256, 512, 1024, 2048, 4096, 8192, 16384];

  iDefBufSz = BUFFER_SIZE.indexOf(defaultBufSz);


  // updateBufferSizeText();

  saveRecording = function(blob, enc) {
    var html, time, url;
    time = new Date();
    url = URL.createObjectURL(blob);
    html = ("<p recording='" + url + "'>") + ("<audio controls src='" + url + "'></audio> ") + ("(" + enc + ") " + (time.toString()) + " ") + ("<a class='btn btn-default' href='" + url + "' download='recording." + enc + "'>") + "Save..." + "</a> " + ("<button class='btn btn-danger' recording='" + url + "'>Delete</button>");
    "</p>";
    $recordingList.prepend($(html));
  };

  $recordingList.on('click', 'button', function(event) {
    var url;
    url = $(event.target).attr('recording');
    $("p[recording='" + url + "']").remove();
    URL.revokeObjectURL(url);
  });

  minSecStr = function(n) {
    return (n < 10 ? "0" : "") + n;
  };

  updateDateTime = function() {
    var sec;
    $dateTime.html((new Date).toString());
    sec = audioRecorder.recordingTime() | 0;
    $timeDisplay.html("" + (minSecStr(sec / 60 | 0)) + ":" + (minSecStr(sec % 60)));
  };

  window.setInterval(updateDateTime, 200);

  progressComplete = false;

  startRecording = function() {
    $recording.removeClass('hidden');
    $record.html('STOP');
    $cancel.removeClass('hidden');
    audioRecorder.setOptions({
      timeLimit: 30 * 60,
      encodeAfterRecord: false,
      progressInterval: 10 * 1000,
      mp3: {
        bitRate: MP3_BIT_RATE[optionValue.mp3]
      }
    });
    audioRecorder.startRecording();
  };

  stopRecording = function(finish) {
    $recording.addClass('hidden');
    $record.html('RECORD');
    $cancel.addClass('hidden');
    if (finish) {
      audioRecorder.finishRecording();
    } else {
      audioRecorder.cancelRecording();
    }
  };

  $record.on('click', function() {
    if (audioRecorder.isRecording()) {
      stopRecording(true);
    } else {
      startRecording();
    }
  });

  $cancel.on('click', function() {
    stopRecording(false);
  });

  audioRecorder.onTimeout = function(recorder) {
    stopRecording(true);
  };


  audioRecorder.onComplete = function(recorder, blob) {
    saveRecording(blob, recorder.encoding);
  };

  audioRecorder.onError = function(recorder, message) {
    onError(message);
  };

}).call(this);
