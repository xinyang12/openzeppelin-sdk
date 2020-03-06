'use strict';
require('../setup');

import sinon from 'sinon';

import { Contracts } from '@openzeppelin/upgrades';

import CaptureLogs from '../helpers/captureLogs';
import check from '../../scripts/check';
import ProjectFile from '../../models/files/ProjectFile';

const expect = require('chai').expect;

describe('check script', function() {
  beforeEach('setup', async function() {
    this.projectFile = new ProjectFile('mocks/packages/package-empty.zos.json');
  });

  beforeEach('stub getFromPathWithUpgradeable to simulate transpilation of contracts', async function() {
    // stub getFromPathWithUpgradeable to fill upgradeable field with the same contract
    sinon.stub(Contracts, 'getFromPathWithUpgradeable').callsFake(function(targetPath, contractName) {
      const contract = Contracts.getFromPathWithUpgradeable.wrappedMethod.apply(this, [targetPath, contractName]);
      contract.upgradeable = contract;
      return contract;
    });
  });

  afterEach(function() {
    sinon.restore();
  });

  beforeEach('capturing log output', function() {
    this.logs = new CaptureLogs();
  });

  afterEach(function() {
    this.logs.restore();
  });

  describe('on single contract', function() {
    it('outputs no issues found', function() {
      const contractName = 'ImplV1';
      this.projectFile.addContract(contractName);
      check({ contractName, projectFile: this.projectFile });
      this.logs.infos[0].should.match(/No issues/);
    });

    it('outputs a warning on contract found by name', function() {
      this.projectFile.addContract('WithDelegateCall');
      check({
        contractName: 'WithDelegateCall',
        projectFile: this.projectFile,
      });
      this.logs.infos.should.be.empty;
      this.logs.warns[0].should.match(/delegatecall/);
    });

    it('outputs a warning on contract not added', function() {
      check({
        contractName: 'WithDelegateCall',
        projectFile: this.projectFile,
      });
      this.logs.infos.should.be.empty;
      this.logs.warns[0].should.match(/delegatecall/);
    });

    it('fails if contract not found', function() {
      expect(() => check({ contractName: 'NotExists', projectFile: this.projectFile })).to.throw();
    });
  });

  describe('on all contracts', function() {
    it('outputs no issues found', function() {
      this.projectFile.addContract('ImplV1');
      check({ projectFile: this.projectFile });
      this.logs.infos[0].should.match(/No issues/);
    });

    it('outputs multiple warnings', function() {
      this.projectFile.addContract('WithDelegateCall');
      this.projectFile.addContract('WithSelfDestruct');
      this.projectFile.addContract('ImplV1');
      check({ projectFile: this.projectFile });
      this.logs.infos.should.be.empty;
      this.logs.warns[0].should.match(/delegatecall/);
      this.logs.warns[1].should.match(/selfdestruct/);
    });

    it('outputs no issues found if no contracts added', function() {
      check({ projectFile: this.projectFile });
      this.logs.infos[0].should.match(/No issues/);
    });
  });
});
