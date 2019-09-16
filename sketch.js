let wrapEl = document.querySelector('#wrap');
let renderers = {};

renderers.host = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.port = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.link = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.tempLink = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
)
renderers.controller = new airglass.Renderer(
  wrapEl.appendChild(document.createElement('canvas')).getContext('2d'),
  new airglass.Scene,
).setInteractable();

setSize(300, 200);

let data = {
  hosts: [{
    id: 1, name: '你',
    x: 40, y: 110,
    imports: [
      {}
    ],
    exports: [
      { id: 1, }
    ],
  }, {
    id: 2, name: '我',
    x: 390, y: 230,
    imports: [
      {}
    ],
    exports: [
      { id: 1, }
    ],
  }]
};

let importPorts = [];
let exportPorts = [];

{
  let hosts = JSON.parse(JSON.stringify(data.hosts));

  let hostTBPadding = 4;
  let hostLRPadding = 14;
  let portMargin = 4;
  let portSize = 10;
  let nameFontSize = 16 * devicePixelRatio;

  hosts.forEach((host, i) => {
    if (!host.id || !host.x || !host.y) return;
    let allImportPortFinalHeight = 0;
    let allExportPortFinalHeight = 0;

    let _module = new airglass.Module({
      x: host.x,
      y: host.y,
      r: 3,
      lineWidth: devicePixelRatio,
      fill: 'hsla(0, 0%, 100%, .3)',
      stroke: '#fff',
      nameFill: '#fff',
      nameFontSize: nameFontSize,
      name: host.name || host.id,
    });

    let moduleInitialHeight = _module.nameFontSize + hostTBPadding * 2;

    _module.width = _module.getTextWidth(renderers.port.ctx) + hostLRPadding * 4 + portSize * 2;

    _module.imports = host.imports &&
      host.imports.length &&
      host.imports.map(portData => {
        allImportPortFinalHeight += portSize + portMargin * 2;
        let x = _module.x + hostLRPadding;
        let y = _module.y + moduleInitialHeight / 2 + allImportPortFinalHeight - portMargin - portSize / 2;
        let ellipse = new airglass.Ellipse({
          _type: 'target',
          _sourceHostId: portData.host,
          _sourcePortId: portData.port,
          x: x,
          y: y,
          width: portSize,
          height: portSize,
          lineWidth: 1,
          fill: '#fff',
          stroke: '#fff',
        });
        ellipse.updatePath();
        renderers.port.scene.add(ellipse)
        importPorts.push(ellipse)
        return ellipse;
      }) || [];

    _module.exports = host.exports &&
      host.exports.length &&
      host.exports.map(portData => {
        allExportPortFinalHeight += portSize + portMargin * 2;
        let x = _module.x + _module.width - hostLRPadding;
        let y = _module.y + moduleInitialHeight / 2 + allExportPortFinalHeight - portMargin - portSize / 2;
        let ellipse = new airglass.Ellipse({
          _type: 'source',
          _hostId: host.id,
          _portId: portData.id,
          x: x,
          y: y,
          width: portSize,
          height: portSize,
          stroke: '#fff',
          fill: '#fff',
        });
        ellipse.updatePath();
        renderers.port.scene.add(ellipse);
        exportPorts.push(ellipse)
        return ellipse;
      }) || [];


    _module.height = moduleInitialHeight + airglass.max([allExportPortFinalHeight, allImportPortFinalHeight]);
    _module.updatePath();
    renderers.host.scene.add(_module);
  });

  exportPorts.forEach(exportPort => {
    importPorts.forEach(importPort => {
      if (importPort._sourceHostId == exportPort._hostId && importPort._sourcePortId == exportPort._portId) {
        let moduleLine = new airglass.BezierLine(
          exportPort,
          importPort
        )
        moduleLine.updatePath();
        moduleLine.stroke = '#fff';
        moduleLine.lineWidth = 3;
        renderers.link.scene.add(moduleLine);
      }
    })
  })


  renderers.host.render();
  renderers.port.render();
  renderers.link.render();
}

renderers.controller.subscribe(renderers.controller, rendererSubscribe)

let lastEventPosition;
let touchstartPosition;
let activeHost;
let activePort;
let activeTempLink;

function rendererSubscribe(actor) {
  let event = actor.event;
  // 初始化上次事件位置
  !lastEventPosition && (lastEventPosition = [event.x, event.y]);

  if (event.type == 'touchstart') {
    touchstart: {
      // 初始化touchstart事件位置
      lastTouchstartPosition = [event.x, event.y];
      let ports = renderers.port.getElementsContainPoint(event);
      if (ports.length) {
        let port = ports[ports.length - 1];
        if (port._type == 'source') {
          activePort = port;
          break touchstart;
        }
      }

      let hosts = renderers.host.getElementsContainPoint(event);
      if (hosts.length) {
        activeHost = hosts[hosts.length - 1];
        break touchstart;
      }
    }
  }

  if (event.type == 'touchmove') {
    touchmove: {
      if (lastEventPosition[0] == event.x && lastEventPosition[1] == event.y) {
        break touchmove;
      }

      if(activePort){
        renderers.tempLink.clean();
        let link = new airglass.BezierLine(
          activePort,
          event
        )
        link.stroke = '#fff';
        link.lineWidth = 3;
        link.updatePath();
        renderers.tempLink.scene.children = [link];
        renderers.tempLink.render();
        break touchmove;
      }

      if (activeHost) {
        activeHost.set({
          x: activeHost.x + event.x - lastEventPosition[0],
          y: activeHost.y + event.y - lastEventPosition[1],
        })
        activeHost.updatePath();
        renderers.host.render();

        activeHost.imports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        activeHost.exports.forEach(port => {
          port.set({
            x: port.x + event.x - lastEventPosition[0],
            y: port.y + event.y - lastEventPosition[1],
          })
          port.updatePath();
        })
        renderers.port.render();
        renderers.link.scene.children.forEach(link => {
          link.updatePath();
        })
        renderers.link.render();
      }
    }
  }

  if (event.type == 'touchend') {
    touchend: {
      activeHost = null;
      renderers.tempLink.clean();

      let ports = renderers.port.getElementsContainPoint(event);
      if(ports.length){
        let port = ports[ports.length - 1];
        if(port !== activePort && port._type == 'target'){
          let link = new airglass.BezierLine(
            activePort,
            port
          )
          link.updatePath();
          link.stroke = '#fff';
          link.lineWidth = 3;
          renderers.link.scene.add(link);
          renderers.link.render();
        }
      }

      activePort = null;
    }
  }

  lastEventPosition = [event.x, event.y];
}

function setSize(width, height) {
  for (let name in renderers) {
    let renderer = renderers[name];
    renderer.ctx.canvas.dataset.name = name;
    renderer.ctx.canvas.width = width * devicePixelRatio;
    renderer.ctx.canvas.height = height * devicePixelRatio;
    renderer.ctx.canvas.style = `position:absolute;top:0;left:0;width:${width}px;height:${height}px;`;
  }
  wrapEl.style.width = `${width}px`;
  wrapEl.style.height = `${height}px`;
  wrapEl.style.position = `relative`;
}