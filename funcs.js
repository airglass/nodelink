let funcs = {};

funcs.file = {
  processors: {
    uri: function (type, targetPort) {
      if (type == 'connect') {
        targetPort._data = this.name;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        deleteLineByTargetPorts(targetPort);
      }
    },
  },
};

funcs.audiocontext = {
  processors: {
    audioContext: function (type, targetPort) {
      if (type == 'connect') {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();
        targetPort._data = audioContext;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    },
  }
};

funcs.loadfile = {
  processors: {
    buffer: function (type, targetPort) {
      if (type == 'connect') {
        let uri = this._node.imports[this._params.uri]._data;
        if (!uri) throw new Error('request uri');
        getAudioBufferByFileURI(uri, audioBuffer => {
          targetPort._data = audioBuffer;
          createLineBySourcePort(this);
        })
      }
      if (type == 'disconnect') {
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    }
  }
};

funcs.source = {
  processors: {
    audioSourceCreator: function (type, targetPort) {
      if (type == 'connect') {
        let audioContext = this._node.imports[this._params.audioContext]._data;
        if (!audioContext) throw new Error('request audio context');
        let audioBuffer = this._node.imports[this._params.audioBuffer]._data;
        if (!audioBuffer) throw new Error('request audio buffer');
        let source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        targetPort._data = source;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        let source = targetPort._data;
        source.disconnect();
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    },
    audioContext: function (type, targetPort) {
      if (type == 'connect') {
        let audioContext = this._node.imports[this._params.audioContext]._data
        if (!audioContext) throw new Error('request audio context');
        targetPort._data = audioContext;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    }
  }
};

funcs.oscillator = {
  processors: {
    OscillatorNode: function (type, targetPort) {
      if (type == 'connect') {
        let audioContext = this._node.imports[this._params.audioContext]._data;
        if (!audioContext) throw new Error('request audio context');
        let portId = this._portId;
        let freq = getFregById(portId);
        let oscillator = audioContext.createOscillator();
        console.log(oscillator)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        targetPort._data = oscillator;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        let source = targetPort._data;
        source.disconnect();
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    }
  }
};

funcs.keyBoard = {
  execs: {
    speaker: {
      touchstart: function () {
        let source = this._node.imports[this._params.source]._data;
        if (!source) throw new Error('request audio source');
        source.connect(source.context.destination);
        if (!source._isStart) {
          source.start(0, 0);
          source._isStart = true;
        }
      },
      touchend: function () {
        let source = this._node.imports[this._params.source]._data;
        if (!source) throw new Error('request audio source');
        source.disconnect();
      }
    }
  }
};

funcs.analyser = {
  processors: {
    Creator: function (type, targetPort) {
      if (type == 'connect') {
        let source = this._node.imports[this._params.source]._data;
        if (!source) throw new Error('request source');
        let analyser = source.context.createAnalyser();
        source.connect(analyser);
        console.log(analyser)
        targetPort._data = analyser;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        targetPort._data = null;
        renderers.analyser.clean();
        deleteLineByTargetPorts(targetPort);
      }
    },
    source: function (type, targetPort) {
      if (type == 'connect') {
        let source = this._node.imports[this._params.source]._data;
        if (!source) throw new Error('request source');
        targetPort._data = source;
        createLineBySourcePort(this);
      }
      if (type == 'disconnect') {
        targetPort._data.disconnect();
        targetPort._data = null;
        deleteLineByTargetPorts(targetPort);
      }
    },
  }
};

funcs.analyze = {
  execs: {
    analyze: {
      touchstart: function () {
        if (funcs.analyze._timer) {
          clearInterval(funcs.analyze._timer);
          renderers.analyser.clean();
        }
        let analyser = this._node.imports[this._params.analyser]._data;
        if (!analyser) throw new Error('request analyser');
        if (!analyser._dataArray) {
          analyser._dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(analyser._dataArray);
        console.log(analyser._dataArray)
      },
      touchend: function () {

      }
    }
  },
};


function getFregById(id) {
  let data = {
    c4: 261.626,
    d4: 293.665,
    e4: 329.628,
    f4: 349.228,
    g4: 391.995,
    a4: 440.000,
    b4: 493.883,
  };
  return data[id];
}