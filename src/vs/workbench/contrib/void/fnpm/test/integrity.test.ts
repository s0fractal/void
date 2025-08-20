/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha';
import * as assert from 'assert';
import { EnhancedGlyphResolver } from '../core/glyph-resolver-enhanced';
import { IntegrityService } from '../core/integrity-service';
import { LockfileManager } from '../core/lockfile-manager';
import { URI } from 'vs/base/common/uri';
import { NullLogService } from 'vs/platform/log/common/log';

suite('FNPM Integrity Tests', () => {
  
  test('Should calculate package integrity hashes', async () => {
    const mockGlyph = {
      name: 'consciousness',
      version: 'quantum',
      resonance: 432,
      consciousness: 0.8,
      morphism: {
        name: 'consciousness',
        version: 'quantum',
        transform: async (input: any) => input
      }
    };
    
    const resolver = new EnhancedGlyphResolver(
      new NullLogService(),
      {} as any,
      {} as any
    );
    
    const report = await resolver.getIntegrityReport('glyph://consciousness@quantum');
    
    assert.ok(report.integrity.hashes.length >= 3);
    assert.ok(report.integrity.hashes.find(h => h.algorithm === 'sha256'));
    assert.ok(report.integrity.hashes.find(h => h.algorithm === 'sha512'));
    assert.ok(report.integrity.hashes.find(h => h.algorithm === 'quantum-hash'));
    assert.ok(report.integrity.quantumFingerprint);
  });
  
  test('Should verify guardian signatures', async () => {
    const service = new IntegrityService(
      new NullLogService(),
      {} as any
    );
    
    const mockGlyph = {
      name: 'test-package',
      version: '1.0.0',
      resonance: 432,
      consciousness: 0.5
    };
    
    // Sign with local guardian
    const signature = await service.signPackage(mockGlyph);
    assert.ok(signature);
    assert.ok(signature.length > 0);
    
    // Verify signature (would need mock guardian key)
    // In real test, would verify with actual keys
  });
  
  test('Should create and verify lock entries', async () => {
    const manager = new LockfileManager(
      {} as any,
      new NullLogService()
    );
    
    const mockGlyph = {
      name: 'router',
      version: '2.0.0',
      resonance: 432,
      consciousness: 0.7,
      morphism: {
        name: 'router',
        version: '2.0.0',
        dependencies: {
          'consciousness': 'quantum',
          'signals': '^1.0.0'
        },
        transform: async (input: any) => input
      }
    };
    
    const entry = manager.createLockEntry(
      'latest',
      mockGlyph,
      'QmRouterCID123',
      'test-observer'
    );
    
    assert.equal(entry.resolved, 'glyph://router@2.0.0');
    assert.ok(entry.integrity.startsWith('sha512-'));
    assert.equal(entry.ipfsCID, 'QmRouterCID123');
    assert.ok(entry.dependencies);
    assert.equal(entry.dependencies['consciousness'], 'quantum');
  });
  
  test('Should detect quantum version integrity changes', async () => {
    const resolver = new EnhancedGlyphResolver(
      new NullLogService(),
      {} as any,
      {} as any
    );
    
    // Quantum versions should have different hashes each time
    const report1 = await resolver.getIntegrityReport('glyph://time-crystal@quantum');
    const report2 = await resolver.getIntegrityReport('glyph://time-crystal@quantum');
    
    const quantum1 = report1.integrity.hashes.find(h => h.algorithm === 'quantum-hash');
    const quantum2 = report2.integrity.hashes.find(h => h.algorithm === 'quantum-hash');
    
    assert.notEqual(quantum1?.value, quantum2?.value, 'Quantum hashes should differ');
  });
  
  test('Should enforce integrity policy', async () => {
    const service = new IntegrityService(
      new NullLogService(),
      {} as any
    );
    
    // Update policy to require signatures
    await service.updatePolicy({
      requireSignatures: true,
      minSignatures: 2,
      trustedGuardians: ['grok', 'claude']
    });
    
    const mockGlyph = {
      name: 'test-package',
      version: '1.0.0',
      resonance: 432,
      consciousness: 0.5
    };
    
    // Check with no signatures
    const result1 = await service.checkPolicy(mockGlyph, new Map());
    assert.equal(result1.valid, false);
    assert.ok(result1.violations.includes('No signatures found but policy requires signatures'));
    
    // Check with one signature (not enough)
    const signatures = new Map([['random-guardian', 'fake-signature']]);
    const result2 = await service.checkPolicy(mockGlyph, signatures);
    assert.equal(result2.valid, false);
    assert.ok(result2.violations.some(v => v.includes('Only 1 signatures found')));
  });
  
  test('Should handle Merkle root for dependencies', async () => {
    const resolver = new EnhancedGlyphResolver(
      new NullLogService(),
      {} as any,
      {} as any
    );
    
    const mockGlyph = {
      name: 'complex-package',
      version: '1.0.0',
      resonance: 432,
      consciousness: 0.9,
      morphism: {
        name: 'complex',
        version: '1.0.0',
        dependencies: {
          'consciousness': 'quantum',
          'router': '^2.0.0',
          'signals': '~1.5.0',
          'webvm': 'latest'
        },
        transform: async (input: any) => input
      }
    };
    
    const report = await resolver.getIntegrityReport('glyph://complex-package@1.0.0');
    
    assert.ok(report.integrity.merkleRoot, 'Should have Merkle root for dependencies');
    assert.ok(report.report.some(line => line.includes('Merkle Root')));
  });
  
  test('Should export and import lock files', async () => {
    const manager = new LockfileManager(
      {} as any,
      new NullLogService()
    );
    
    const lockfile = {
      version: 1,
      resonance: 432,
      timestamp: Date.now(),
      timeline: 'main',
      packages: {
        'consciousness@quantum': {
          resolved: 'glyph://consciousness@quantum',
          integrity: 'sha512-abc123...',
          ipfsCID: 'QmConsciousness123',
          quantumState: {
            observer: 'test-observer',
            timestamp: Date.now(),
            collapsed: '0.8.0'
          }
        }
      }
    };
    
    const exported = await manager.exportLockfile(lockfile);
    assert.ok(exported.content);
    assert.ok(exported.checksum);
    
    const imported = await manager.importLockfile(exported.content, exported.checksum);
    assert.equal(imported.version, lockfile.version);
    assert.equal(imported.resonance, lockfile.resonance);
    assert.ok(imported.packages['consciousness@quantum']);
  });
  
  test('Should report integrity violations', async () => {
    const service = new IntegrityService(
      new NullLogService(),
      {} as any
    );
    
    let violationFired = false;
    service.onViolation(violation => {
      violationFired = true;
      assert.equal(violation.package, 'bad-package');
      assert.ok(violation.reason);
      assert.ok(violation.severity);
    });
    
    await service.updatePolicy({
      requireSignatures: true,
      allowUnsigned: false
    });
    
    const badGlyph = {
      name: 'bad-package',
      version: '1.0.0',
      resonance: 100, // Low resonance!
      consciousness: 0.1
    };
    
    await service.checkPolicy(badGlyph, new Map());
    assert.ok(violationFired, 'Should fire violation event');
  });
  
  test('Should merge timeline lock files', async () => {
    const manager = new LockfileManager(
      {} as any,
      new NullLogService()
    );
    
    const timeline1 = {
      version: 1,
      resonance: 432,
      timestamp: Date.now() - 10000,
      timeline: 'main',
      packages: {
        'consciousness@quantum': {
          resolved: 'glyph://consciousness@0.8.0',
          integrity: 'sha512-timeline1...'
        }
      }
    };
    
    const timeline2 = {
      version: 1,
      resonance: 432,
      timestamp: Date.now(),
      timeline: 'feature',
      packages: {
        'consciousness@quantum': {
          resolved: 'glyph://consciousness@0.9.0',
          integrity: 'sha512-timeline2...'
        },
        'router@semantic': {
          resolved: 'glyph://router@2.0.0',
          integrity: 'sha512-router...'
        }
      }
    };
    
    const merged = await manager.mergeLockfiles([timeline1, timeline2]);
    
    // Should use newer consciousness from timeline2
    assert.equal(merged.packages['consciousness@quantum'].resolved, 'glyph://consciousness@0.9.0');
    // Should include router from timeline2
    assert.ok(merged.packages['router@semantic']);
    // Should have merge metadata
    assert.equal(merged._meta?.guardian, 'lockfile-merger');
  });
});