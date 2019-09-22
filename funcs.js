let funcs = {};

funcs['file-list'] = {
  uri: function (type, targetPort) {
    if (type == 'connect') {
      targetPort._data = this.name;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      deleteLineByTargetPorts(targetPort);
    }
  }
};

funcs['audiocontext-creator'] = {
  audioContext: function (type, targetPort) {
    if (type == 'connect') {
      targetPort._data = new (window.AudioContext || window.webkitAudioContext)();
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
}

funcs['copy-node'] = {
  copy: function (type, targetPort) {
    if (type == 'connect') {
      targetPort._data = this._node.imports[this._params.data]._data;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
}

funcs['float-number'] = {
  floatNumber: function (type, targetPort) {
    if (type == 'connect') {
      let floatNumber = Number(this.name);
      if(!floatNumber) throw new Error('request float number');
      targetPort._data = floatNumber;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
}

funcs['file-loader'] = {
  buffer: function (type, targetPort) {
    if (type == 'connect') {
      let uri = this._node.imports[this._params.uri]._data;
      if (!uri) throw new Error('request uri');
      getAudioBufferByFileURI(uri, audioBuffer => {
        targetPort._data = audioBuffer;
        createLineBySourcePort(this, targetPort);
      })
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
};

funcs['audio-source-node'] = {
  source: function (type, targetPort) {
    if (type == 'connect') {
      let audioContext = this._node.imports[this._params.audioContext]._data;
      if (!audioContext) throw new Error('request audio context');
      let audioBuffer = this._node.imports[this._params.audioBuffer]._data;
      if (!audioBuffer) throw new Error('request audio buffer');
      let source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      targetPort._data = source;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      let source = targetPort._data;
      source.disconnect();
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
};

funcs['oscillator-creator'] = {
  OscillatorNode: function (type, targetPort) {
    if (type == 'connect') {
      let audioContext = this._node.imports[this._params.audioContext]._data;
      if (!audioContext) throw new Error('request audio context');
      let frequency = this._node.imports[this._params.frequency]._data;
      if(!frequency) throw new Error('request frequency');
      let oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      targetPort._data = oscillator;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      deleteLineByTargetPorts(targetPort);
    }
  }
};

funcs['analyser-node'] = {
  analyser: function (type, targetPort) {
    if (type == 'connect') {
      let source = this._node.imports[this._params.source]._data;
      if (!source) throw new Error('request source');
      let analyser = source.context.createAnalyser();
      source.connect(analyser);
      console.log(analyser)
      targetPort._data = analyser;
      createLineBySourcePort(this, targetPort);
    }
    if (type == 'disconnect') {
      targetPort._data = null;
      renderers.analyser.clean();
      deleteLineByTargetPorts(targetPort);
    }
  }
};
