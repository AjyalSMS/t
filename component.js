"use strict";

define("nodes/components/driver-skel/component", ["exports", "@ember/object/computed", "@ember/object", "@ember/component", "shared/mixins/node-driver", "./template", "@ember/service", "rsvp"], function (exports, _computed, _object, _component, _nodeDriver, _template, _service, _rsvp) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var ENDPOINT = 'https://ecs.aliyuncs.com';
  var PAGE_SIZE = 50;
  var NONE_OPT_DISK = [{
    value: 'cloud'
  }];
  var DEFAULT_IMAGE = 'ubuntu_16_04_64';
  var OPT_DISK = [{
    value: 'cloud_efficiency'
  }, {
    value: 'cloud_ssd'
  }];
  var DEFAULT_INSTANCE_TYPE = 'ecs.g5.large';
  exports.default = _component.default.extend(_nodeDriver.default, {
    intl: (0, _service.inject)(),
    settings: (0, _service.inject)(),
    layout: _template.default,
    driverName: 'aliyunecs',
    zones: null,
    regions: null,
    securityGroups: null,
    images: null,
    instanceTypes: null,
    ecsClient: null,
    step: 1,
    config: (0, _computed.alias)('model.aliyunecsConfig'),
    actions: {
      alyLogin: function alyLogin(cb) {
        var _this = this;

        (0, _object.setProperties)(this, {
          'errors': null,
          'config.accessKeyId': ((0, _object.get)(this, 'config.accessKeyId') || '').trim(),
          'config.accessKeySecret': ((0, _object.get)(this, 'config.accessKeySecret') || '').trim()
        });
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var accessKey = (0, _object.get)(this, 'config.accessKeyId');
        var accessSecret = (0, _object.get)(this, 'config.accessKeySecret');

        if (!accessKey) {
          errors.push(intl.t('nodeDriver.aliyunecs.errors.accessKeyRequired'));
        }

        if (!accessSecret) {
          errors.push(intl.t('nodeDriver.aliyunecs.errors.accessSecretRequired'));
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        var ecs;

        try {
          var location = window.location;
          var endpoint = (0, _object.get)(this, 'config.apiEndpoint') ? (0, _object.get)(this, 'config.apiEndpoint') : ENDPOINT;
          endpoint = "".concat((0, _object.get)(this, 'app.proxyEndpoint'), "/").concat(endpoint.replace('//', '/'));
          endpoint = "".concat(location.origin).concat(endpoint);
          ecs = new ALY.ECS({
            accessKeyId: (0, _object.get)(this, 'config.accessKeyId'),
            secretAccessKey: (0, _object.get)(this, 'config.accessKeySecret'),
            apiVersion: '2014-05-26',
            endpoint: endpoint
          });
          ecs.describeRegions({}, function (err, res) {
            if (err) {
              var _errors = (0, _object.get)(_this, 'errors') || [];

              _errors.pushObject(err.message || err);

              (0, _object.set)(_this, 'errors', _errors);
              cb();
              return;
            }

            (0, _object.set)(_this, 'ecsClient', ecs);
            (0, _object.set)(_this, 'regions', res.Regions.Region.map(function (region) {
              return {
                value: region.RegionId,
                label: region.LocalName
              };
            }));

            _this.regionDidChange();

            (0, _object.set)(_this, 'step', 2);
            cb();
          });
        } catch (err) {
          var _errors2 = (0, _object.get)(this, 'errors') || [];

          _errors2.pushObject(err.message || err);

          (0, _object.set)(this, 'errors', _errors2);
          cb();
          return;
        }
      },
      loadStorageTypes: function loadStorageTypes(cb) {
        (0, _object.set)(this, 'errors', null);
        var errors = (0, _object.get)(this, 'errors') || [];
        var intl = (0, _object.get)(this, 'intl');
        var zone = (0, _object.get)(this, 'config.zone');
        var vpcId = (0, _object.get)(this, 'config.vpcId');
        var vswitchId = (0, _object.get)(this, 'config.vswitchId');

        if (zone) {
          if (!vpcId) {
            errors.push(intl.t('nodeDriver.aliyunecs.errors.vpcIdRequired'));
          }

          if (!vswitchId) {
            errors.push(intl.t('nodeDriver.aliyunecs.errors.vswitchIdRequired'));
          }
        }

        if (errors.length > 0) {
          (0, _object.set)(this, 'errors', errors);
          cb();
          return;
        }

        if (!(0, _object.get)(this, 'config.securityGroup')) {
          (0, _object.set)(this, 'config.securityGroup', 'docker-machine');
        }

        (0, _object.set)(this, 'step', 3);
        this.diskCategoryChoicesDidChange();
        cb();
      },
      loadInstanceTypes: function loadInstanceTypes(cb) {
        var _this2 = this;

        this.fetch('Image', 'Images').then(function (images) {
          (0, _object.set)(_this2, 'images', images.filter(function (image) {
            return image.raw.OSType === 'linux' && ((_this2, 'config.ioOptimized') === 'none' || image.raw.IsSupportIoOptimized);
          }).map(function (image) {
            return {
              label: image.raw.ImageOwnerAlias === 'system' ? image.raw.OSName : image.raw.ImageName,
              value: image.value,
              raw: image.raw
            };
          }));
          var imageId = (0, _object.get)(_this2, 'config.imageId');
          var found = (0, _object.get)(_this2, 'images').findBy('value', imageId);

          if (!found) {
            var ubuntu = (0, _object.get)(_this2, 'images').find(function (i) {
              return (0, _object.get)(i, 'value').startsWith(DEFAULT_IMAGE);
            });
            var defaultImage = ubuntu ? ubuntu.value : (0, _object.get)(_this2, 'images.firstObject.value');
            (0, _object.set)(_this2, 'config.imageId', defaultImage);
          }

          _this2.fetch('InstanceType', 'InstanceTypes').then(function (instanceTypes) {
            _this2.fetchAvailableResources().then(function (availableResources) {
              (0, _object.set)(_this2, 'instanceTypes', instanceTypes.filter(function (instanceType) {
                return availableResources.indexOf(instanceType.value) > -1;
              }).map(function (instanceType) {
                return {
                  group: instanceType.raw.InstanceTypeFamily,
                  value: instanceType.value,
                  label: "".concat(instanceType.raw.InstanceTypeId, " ( ").concat(instanceType.raw.CpuCoreCount, " ").concat(instanceType.raw.CpuCoreCount > 1 ? 'Cores' : 'Core', " ").concat(instanceType.raw.MemorySize, "GB RAM )")
                };
              }));
              var instanceType;

              if ((0, _object.get)(_this2, 'instanceTypes').findBy('value', (0, _object.get)(_this2, 'config.instanceType'))) {
                instanceType = (0, _object.get)(_this2, 'config.instanceType');
              } else {
                instanceType = (0, _object.get)(_this2, 'instanceTypes.firstObject.value');
              }

              (0, _object.set)(_this2, 'config.instanceType', instanceType);
              (0, _object.set)(_this2, 'step', 4);
              cb();
            });
          }).catch(function (err) {
            var errors = (0, _object.get)(_this2, 'errors') || [];
            errors.pushObject(err.message || err);
            (0, _object.set)(_this2, 'errors', errors);
            cb();
            return;
          });
        }).catch(function (err) {
          var errors = (0, _object.get)(_this2, 'errors') || [];
          errors.pushObject(err.message || err);
          (0, _object.set)(_this2, 'errors', errors);
          cb();
          return;
        });
      }
    },
    zoneDidChange: (0, _object.observer)('config.zone', function () {
      var _this3 = this;

      if ((0, _object.get)(this, 'config.vpcId') && !(0, _object.get)(this, 'vswitches')) {
        this.fetch('VSwitch', 'VSwitches').then(function (vswitches) {
          (0, _object.set)(_this3, 'vswitches', vswitches);

          _this3.resetVswitch();
        });
      } else {
        this.resetVswitch();
      }
    }),
    vpcDidChange: (0, _object.observer)('config.vpcId', function () {
      var _this4 = this;

      var vpcId = (0, _object.get)(this, 'config.vpcId');

      if (vpcId) {
        this.fetch('VSwitch', 'VSwitches').then(function (vswitches) {
          (0, _object.set)(_this4, 'vswitches', vswitches);
          var selectedVSwitch = (0, _object.get)(_this4, 'config.vswitchId');

          if (selectedVSwitch) {
            var found = vswitches.findBy('value', selectedVSwitch);

            if (!found) {
              (0, _object.set)(_this4, 'config.vswitchId', null);
            }
          }
        });
        this.fetch('SecurityGroup', 'SecurityGroups').then(function (securityGroups) {
          (0, _object.set)(_this4, 'securityGroups', securityGroups);
          var selectedSecurityGroup = (0, _object.get)(_this4, 'config.securityGroup');

          if (selectedSecurityGroup) {
            var found = securityGroups.findBy('value', selectedSecurityGroup);

            if (!found) {
              (0, _object.set)(_this4, 'config.securityGroup', 'docker-machine');
            }
          }
        });
      } else {
        (0, _object.set)(this, 'config.vswitchId', null);
        (0, _object.set)(this, 'config.securityGroup', 'docker-machine');
      }
    }),
    regionDidChange: (0, _object.observer)('config.region', function () {
      var _this5 = this;

      var region = (0, _object.get)(this, 'config.region');

      if (region) {
        this.fetch('Vpc', 'Vpcs').then(function (vpcs) {
          (0, _object.set)(_this5, 'vpcs', vpcs);
          var selectedVPC = (0, _object.get)(_this5, 'config.vpcId');

          if (selectedVPC) {
            var found = vpcs.findBy('value', selectedVPC);

            if (!found) {
              (0, _object.set)(_this5, 'config.vpcId', null);
            } else {
              _this5.vpcDidChange();
            }
          }
        });
        this.fetch('Zone', 'Zones').then(function (zones) {
          (0, _object.set)(_this5, 'zones', zones);
          var selectedZone = (0, _object.get)(_this5, 'config.zone');

          if (selectedZone) {
            var found = zones.findBy('value', selectedZone);

            if (!found) {
              (0, _object.set)(_this5, 'config.zone', null);
            } else {
              _this5.zoneDidChange();
            }
          }
        });
      }
    }),
    diskCategoryChoicesDidChange: (0, _object.observer)('diskCategoryChoices.@each.value', function () {
      var systemDiskCategory = (0, _object.get)(this, 'config.systemDiskCategory');
      var found = (0, _object.get)(this, 'diskCategoryChoices').findBy('value', systemDiskCategory);

      if (!found) {
        (0, _object.set)(this, 'config.systemDiskCategory', (0, _object.get)(this, 'diskCategoryChoices.firstObject.value'));
      }

      var diskCategory = (0, _object.get)(this, 'config.diskCategory');
      found = (0, _object.get)(this, 'diskCategoryChoices').findBy('value', diskCategory);

      if (!found) {
        (0, _object.set)(this, 'config.diskCategory', (0, _object.get)(this, 'diskCategoryChoices.firstObject.value'));
      }
    }),
    filteredVSwitches: (0, _object.computed)('vswitches.[]', 'config.zone', function () {
      var zone = (0, _object.get)(this, 'config.zone');
      return ((0, _object.get)(this, 'vswitches') || []).filter(function (swith) {
        if (zone && zone !== swith.raw.ZoneId) {
          return false;
        }

        return true;
      });
    }),
    diskCategoryChoices: (0, _object.computed)('config.ioOptimized', function () {
      return (0, _object.get)(this, 'config.ioOptimized') === 'none' ? NONE_OPT_DISK : OPT_DISK;
    }),
    bootstrap: function bootstrap() {
      var config = (0, _object.get)(this, 'globalStore').createRecord({
        type: 'aliyunecsConfig',
        accessKeySecret: '',
        instanceType: DEFAULT_INSTANCE_TYPE,
        ioOptimized: 'optimized'
      });
      (0, _object.set)(this, 'model.engineInstallURL', 'http://dev-tool.oss-cn-shenzhen.aliyuncs.com/docker-install/1.13.1.sh');
      (0, _object.set)(this, 'model.engineRegistryMirror', ['https://s06nkgus.mirror.aliyuncs.com']);
      (0, _object.set)(this, 'model.aliyunecsConfig', config);
    },
    resetVswitch: function resetVswitch() {
      var switches = (0, _object.get)(this, 'filteredVSwitches');
      var selectedVSwitch = (0, _object.get)(this, 'config.vswitchId');

      if (selectedVSwitch) {
        var found = switches.findBy('value', selectedVSwitch);

        if (!found) {
          (0, _object.set)(this, 'config.vswitchId', null);
        }
      }
    },
    validate: function validate() {
      this._super();

      var errors = (0, _object.get)(this, 'model').validationErrors();
      var intl = (0, _object.get)(this, 'intl');
      var name = (0, _object.get)(this, 'model.name');
      var sshPassword = (0, _object.get)(this, 'config.sshPassword');
      var lower = /[a-z]/.test(sshPassword) ? 1 : 0;
      var upper = /[A-Z]/.test(sshPassword) ? 1 : 0;
      var number = /[0-9]/.test(sshPassword) ? 1 : 0;
      var special = /[?+*$^().|<>';:\-=\[\]\{\},&%#@!~`\\]/.test(sshPassword) ? 1 : 0;

      if (!name) {
        errors.push('Name is required');
      }

      if (sshPassword && sshPassword.length < 8 || sshPassword.length > 30) {
        errors.push(intl.t('nodeDriver.aliyunecs.errors.sshPasswordLengthNotValid'));
      }

      if (sshPassword && !/[?+*$^().|<>';:\-=\[\]\{\},&%#@!~`\\a-zA-Z0-9]+/.test(sshPassword)) {
        errors.push(intl.t('nodeDriver.aliyunecs.errors.sshPasswordInvalidCharacter'));
      }

      if (sshPassword && lower + upper + number + special < 3) {
        errors.push((0, _object.get)(this, 'intl').t('nodeDriver.aliyunecs.errors.sshPasswordFormatError'));
      }

      (0, _object.set)(this, 'errors', errors);
      return errors.length === 0;
    },
    fetchAvailableResources: function fetchAvailableResources() {
      var ecs = (0, _object.get)(this, 'ecsClient');
      var region = (0, _object.get)(this, 'config.region');
      var results = [];
      var params = {
        RegionId: region,
        IoOptimized: (0, _object.get)(this, 'config.ioOptimized'),
        SystemDiskCategory: (0, _object.get)(this, 'config.systemDiskCategory'),
        DataDiskCategory: (0, _object.get)(this, 'config.diskCategory')
      };

      if ((0, _object.get)(this, 'config.zone')) {
        params['ZoneId'] = (0, _object.get)(this, 'config.zone');
      }

      return new _rsvp.Promise(function (resolve, reject) {
        ecs['describeAvailableResource'](params, function (err, res) {
          if (err) {
            reject(err);
            return;
          }

          var zones = res['AvailableZones'];
          zones.AvailableZone.forEach(function (zone) {
            zone['AvailableResources']['AvailableResource'].forEach(function (resource) {
              resource['SupportedResources']['SupportedResource'].forEach(function (support) {
                if (support.Status === 'Available' && results.indexOf(support.Value) === -1) {
                  results.pushObject(support.Value);
                }
              });
            });
          });
          resolve(results);
        });
      });
    },
    fetch: function fetch(resource, plural) {
      var _this6 = this;

      var page = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
      var ecs = (0, _object.get)(this, 'ecsClient');
      var region = (0, _object.get)(this, 'config.region');
      var results = [];
      var params = {
        PageSize: PAGE_SIZE,
        PageNumber: page
      };

      switch (resource) {
        case 'InstanceType':
          params = {};
          break;

        case 'VSwitch':
          params.VpcId = (0, _object.get)(this, 'config.vpcId');
          break;

        case 'SecurityGroup':
          params.VpcId = (0, _object.get)(this, 'config.vpcId');
          params.RegionId = region;
          break;

        case 'Zone':
          params = {
            RegionId: region
          };
          break;

        default:
          params.RegionId = region;
      }

      return new _rsvp.Promise(function (resolve, reject) {
        ecs["describe".concat(plural)](params, function (err, res) {
          if (err) {
            reject(err);
            return;
          }

          var current = res["".concat(plural)][resource];
          results.pushObjects(current.map(function (item) {
            return {
              label: item["".concat(resource, "Id")],
              value: item["".concat(resource, "Id")],
              raw: item
            };
          }));

          if (res.TotalCount > PAGE_SIZE * (page - 1) + current.length) {
            return _this6.fetch(resource, plural, page + 1).then(function (array) {
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
