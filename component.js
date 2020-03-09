"use strict";

define("nodes/components/driver-skel/component", ["exports", "@ember/component", "shared/mixins/cluster-driver", "./template", "@ember/service", "@ember/object", "rsvp", "@ember/object/computed"], function (exports, _component, _clusterDriver, _template, _service, _object, _rsvp, _computed) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var ENDPOINT = 'ecs.aliyuncs.com';
  var PAGE_SIZE = 50;
  var K8S_1_11_5 = '1.11.5';
  var K8S_1_12_6_1 = '1.12.6-aliyun.1';
  var VERSIONS = [{
    value: K8S_1_12_6_1,
    label: K8S_1_12_6_1
  }, {
    value: K8S_1_11_5,
    label: K8S_1_11_5
  }];
  var MANAGED_VERSIONS = [{
    value: K8S_1_12_6_1,
    label: K8S_1_12_6_1
  }];
  var KUBERNETES = 'Kubernetes';
  var MANAGED = 'ManagedKubernetes';
  var DISKS = [{
    label: 'clusterNew.aliyunkcs.disk.ssd',
    value: 'cloud_ssd'
  }, {
    label: 'clusterNew.aliyunkcs.disk.efficiency',
    value: 'cloud_efficiency'
  }];
  var CLUSTER_TYPES = [{
    label: 'clusterNew.aliyunkcs.clusters.k8s',
    value: KUBERNETES
  }, {
    label: 'clusterNew.aliyunkcs.clusters.managed',
    value: MANAGED
  }];
  var REGIONS = [{
    label: 'cn-qingdao',
    value: 'cn-qingdao'
  }, {
    label: 'cn-beijing',
    value: 'cn-beijing',
    managed: true
  }, {
    label: 'cn-zhangjiakou',
    value: 'cn-zhangjiakou'
  }, {
    label: 'cn-shanghai',
    value: 'cn-shanghai',
    managed: true
  }, {
    label: 'cn-shenzhen',
    value: 'cn-shenzhen'
  }, {
    label: 'cn-hangzhou',
    value: 'cn-hangzhou',
    managed: true
  }, {
    label: 'cn-hongkong',
    value: 'cn-hongkong'
  }, {
    label: 'cn-huhehaote',
    value: 'cn-huhehaote'
  }, {
    label: 'ap-northeast-1',
    value: 'ap-northeast-1'
  }, {
    label: 'ap-south-1',
    value: 'ap-south-1',
    managed: true
  }, {
    label: 'ap-southeast-1',
    value: 'ap-southeast-1',
    managed: true
  }, {
    label: 'ap-southeast-2',
    value: 'ap-southeast-2'
  }, {
    label: 'ap-southeast-5',
    value: 'ap-southeast-5',
    managed: true
  }, {
    label: 'us-east-1',
    value: 'us-east-1'
  }, {
    label: 'us-west-1',
    value: 'us-west-1'
  }, {
    label: 'me-east-1',
    value: 'me-east-1'
  }, {
    label: 'eu-central-1',
    value: 'eu-central-1'
  }, {
    label: 'ap-southeast-3',
    value: 'ap-southeast-3',
    managed: true
  }];
  exports.default = _component.default.extend(_clusterDriver.default, {
    intl: (0, _service.inject)(),
    layout: _template.default,
    configField: 'aliyunEngineConfig',
    aliyunClient: null,
    step: 1,
    regionChoices: REGIONS,
    versionChoices: VERSIONS,
    managedVersionChoices: MANAGED_VERSIONS,
    diskChoices: DISKS,
    storageDiskChoices: null,
    zoneChoices: null,
    vpcChoices: null,
    sgChoices: null,
    keyChoices: null,
    allSubnets: null,
    allInstances: null,
    editing: (0, _computed.equal)('mode', 'edit'),
    isNew: (0, _computed.equal)('mode', 'new'),
    init: function init() {
      this._super.apply(this, arguments);

      var config = (0, _object.get)(this, 'cluster.aliyunEngineConfig');

      if (!config) {
        config = this.get('globalStore').createRecord({
          type: 'aliyunEngineConfig',
          accessKeyId: null,
          accessKeySecret: null,
          regionId: 'cn-beijing',
          clusterType: KUBERNETES,
          kubernetesVersion: K8S_1_11_5,
          zoneId: null,
          snatEntry: true,
          publicSlb: true,
          masterSystemDiskSize: 120,
          masterSystemDiskCategory: 'cloud_efficiency',
          masterInstanceType: 'ecs.n1.large',
          workerSystemDiskSize: 120,
          workerSystemDiskCategory: 'cloud_efficiency',
          workerDataDiskSize: 120,
          workerDataDiskCategory: 'cloud_efficiency',
          workerInstanceType: 'ecs.n1.large',
          numOfNodes: 3,
          workerDataDisk: true,
          keyPair: null
        });
        (0, _object.set)(this, 'cluster.aliyunEngineConfig', config);
      }
    },
    actions: {
      aliyunLogin: function aliyunLogin(cb) {
        var _this = this;

        (0, _object.setProperties)(this, {
          'errors': null,
          'config.accessKeyId': ((0, _object.get)(this, 'config.accessKeyId') || '').trim(),
          'config.accessKeySecret': ((0, _object.get)(this, 'config.accessKeySecret') || '').trim()
        });
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var accessKeyId = (0, _object.get)(this, 'config.accessKeyId');
        var accessKeySecret = (0, _object.get)(this, 'config.accessKeySecret');

        if (!accessKeyId) {
          errors.push(intl.t('clusterNew.aliyunkcs.accessKeyId.required'));
        }

        if (!accessKeySecret) {
          errors.push(intl.t('clusterNew.aliyunkcs.accessKeySecret.required'));
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        return this.fetch('Zone', 'Zones').then(function (zones) {
          (0, _object.set)(_this, 'zoneChoices', zones.sortBy('label'));

          if (!(0, _object.get)(_this, 'config.zoneId') && (0, _object.get)(_this, 'zoneChoices.length')) {
            (0, _object.set)(_this, 'config.zoneId', (0, _object.get)(_this, 'zoneChoices.firstObject.value'));
          }

          (0, _object.set)(_this, 'step', 2);
          cb(true);
        }).catch(function () {
          cb(false);
        });
      },
      configMaster: function configMaster(cb) {
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var zoneId = (0, _object.get)(this, 'config.zoneId');

        if (!zoneId) {
          errors.push(intl.t('clusterNew.aliyunkcs.zoneId.required'));
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        this.setInstances();
        var instances = (0, _object.get)(this, 'selectedZone.raw.AvailableInstanceTypes.InstanceTypes');
        var found = instances.indexOf((0, _object.get)(this, 'config.masterInstanceType'));

        if (!found) {
          (0, _object.set)(this, 'config.masterInstanceType', null);
        }

        (0, _object.set)(this, 'step', 3);
        cb(true);
      },
      configWorker: function configWorker(cb) {
        var _this2 = this;

        this.setInstances();
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var masterInstanceType = (0, _object.get)(this, 'config.masterInstanceType');

        if (!masterInstanceType && (0, _object.get)(this, 'config.clusterType') === KUBERNETES) {
          errors.push(intl.t('clusterNew.aliyunkcs.instanceType.required'));
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        var instances = (0, _object.get)(this, 'selectedZone.raw.AvailableInstanceTypes.InstanceTypes');
        var found = instances.indexOf((0, _object.get)(this, 'config.workerInstanceType')) > -1;

        if (!found) {
          (0, _object.set)(this, 'config.workerInstanceType', null);
        }

        return this.fetch('KeyPair', 'KeyPairs').then(function (keyChoices) {
          (0, _object.set)(_this2, 'keyChoices', keyChoices);

          if (!(0, _object.get)(_this2, 'config.keyPair') && (0, _object.get)(_this2, 'keyChoices.length')) {
            (0, _object.set)(_this2, 'config.keyPair', (0, _object.get)(_this2, 'keyChoices.firstObject.value'));
          }

          (0, _object.set)(_this2, 'step', 4);
          cb(true);
        }).catch(function () {
          cb(false);
        });
      },
      save: function save(cb) {
        (0, _object.setProperties)(this, {
          'errors': null
        });
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var keyPair = (0, _object.get)(this, 'config.keyPair');
        var workerInstanceType = (0, _object.get)(this, 'config.workerInstanceType');

        if (!workerInstanceType) {
          errors.push(intl.t('clusterNew.aliyunkcs.instanceType.required'));
        }

        if (!keyPair) {
          errors.push(intl.t('clusterNew.aliyunkcs.keyPair.required'));
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        this.send('driverSave', cb);
      }
    },
    clusterNameDidChange: (0, _object.observer)('cluster.name', function () {
      (0, _object.setProperties)(this, {
        'config.name': (0, _object.get)(this, 'cluster.name'),
        'config.displayName': (0, _object.get)(this, 'cluster.name')
      });
    }),
    clusterTypeDidChange: (0, _object.observer)('config.clusterType', function () {
      if ((0, _object.get)(this, 'config.clusterType') === KUBERNETES) {
        (0, _object.set)(this, 'config.kubernetesVersion', (0, _object.get)(VERSIONS, 'firstObject.value'));
      } else {
        (0, _object.set)(this, 'config.kubernetesVersion', (0, _object.get)(MANAGED_VERSIONS, 'firstObject.value'));
      }
    }),
    minNumOfNodes: (0, _object.computed)('config.clusterType', function () {
      return (0, _object.get)(this, 'config.clusterType') === KUBERNETES ? 0 : 2;
    }),
    selectedZone: (0, _object.computed)('config.zoneId', 'zoneChoices', function () {
      var zoneChoices = (0, _object.get)(this, 'zoneChoices') || [];
      return zoneChoices.findBy('value', (0, _object.get)(this, 'config.zoneId'));
    }),
    clusterTypeChoices: (0, _object.computed)('config.regionId', 'zoneChoices', function () {
      var region = REGIONS.findBy('value', (0, _object.get)(this, 'config.regionId'));

      if (region && (0, _object.get)(region, 'managed')) {
        return CLUSTER_TYPES;
      } else {
        return CLUSTER_TYPES.filter(function (type) {
          return (0, _object.get)(type, 'value') !== MANAGED;
        });
      }
    }),
    setInstances: function setInstances() {
      var instances = (0, _object.get)(this, 'selectedZone.raw.AvailableInstanceTypes.InstanceTypes');
      (0, _object.set)(this, 'instanceChoices', instances.map(function (i) {
        var g = i.split('.')[1];
        return {
          group: g,
          label: i,
          value: i
        };
      }));
    },
    fetch: function fetch(resource, plural) {
      var _this3 = this;

      var page = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
      (0, _object.set)(this, 'errors', []);
      var ecs = (0, _object.get)(this, 'ecsClient');

      if (!ecs) {
        ecs = new ALY.ECS({
          accessKeyId: (0, _object.get)(this, 'config.accessKeyId'),
          secretAccessKey: (0, _object.get)(this, 'config.accessKeySecret'),
          apiVersion: '2014-05-26',
          endpoint: "".concat(window.location.origin, "/meta/proxy/https:/").concat(ENDPOINT)
        });
      }

      var region = (0, _object.get)(this, 'config.regionId');
      var results = [];
      var params = {
        PageSize: PAGE_SIZE,
        PageNumber: page
      };
      var resultKey = 'Id';

      switch (resource) {
        case 'Zone':
          params = {
            RegionId: region
          };
          break;

        case 'KeyPair':
          params = {
            RegionId: region
          };
          resultKey = 'Name';
          break;

        default:
          params.RegionId = region;
      }

      return new _rsvp.Promise(function (resolve, reject) {
        ecs["describe".concat(plural)](params, function (err, res) {
          if (err) {
            reject(err);
            var errors = (0, _object.get)(_this3, 'errors') || [];
            errors.pushObject(err.message || err);
            (0, _object.set)(_this3, 'errors', errors);
            return;
          }

          var current = res["".concat(plural)][resource];

          if (!(0, _object.get)(_this3, 'ecsClient')) {
            (0, _object.set)(_this3, 'ecsClient', ecs);
          }

          results.pushObjects(current.map(function (item) {
            return {
              label: item["".concat(resource).concat(resultKey)],
              value: item["".concat(resource).concat(resultKey)],
              raw: item
            };
          }));

          if (res.TotalCount > PAGE_SIZE * (page - 1) + current.length) {
            return _this3.fetch(resource, plural, page + 1).then(function (array) {
              results.pushObjects(array);
              resolve(results);
            }).catch(function (err) {
              reject(err);
            });
          } else {
            resolve(results);
          }
        });
      });
    }
  });
});;
"use strict";

define("ui/components/driver-skel/component", ["exports", "nodes/components/driver-skel/component"], function (exports, _component) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function () {
      return _component.default;
    }
  });
});
