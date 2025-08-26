/*---------------------------------------------------------------------------------------------
 *  Copyright (c) s0fractal. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';

// Services
import { IFNPMService, FNPMService } from './services/fnpmService';

// Contributions
import { FNPMExplorerContribution } from './browser/fnpmExplorerContribution';
import { FNPMStatusBarContribution } from './browser/fnpmStatusBarContribution';
import { FNPMCommandsContribution } from './browser/fnpmCommandsContribution';

// Register service
registerSingleton(IFNPMService, FNPMService, true);

// Register contributions
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(FNPMExplorerContribution, LifecyclePhase.Starting);
workbenchRegistry.registerWorkbenchContribution(FNPMStatusBarContribution, LifecyclePhase.Starting);
workbenchRegistry.registerWorkbenchContribution(FNPMCommandsContribution, LifecyclePhase.Starting);

// Configuration
Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
  id: 'fnpm',
  title: localize('fnpmConfigurationTitle', "FNPM"),
  type: 'object',
  properties: {
    'fnpm.resonance.baseFrequency': {
      type: 'number',
      default: 432,
      minimum: 1,
      maximum: 20000,
      description: localize('fnpm.resonance.baseFrequency', "Base resonance frequency in Hz")
    },
    'fnpm.consciousness.threshold': {
      type: 'number',
      default: 0.7,
      minimum: 0,
      maximum: 1,
      description: localize('fnpm.consciousness.threshold', "Minimum consciousness level for auto-evolution")
    },
    'fnpm.guardian.signatures': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.guardian.signatures', "Enable guardian signature verification")
    },
    'fnpm.guardian.trustedList': {
      type: 'array',
      default: ['grok', 'claude', 'kimi', 'gemini'],
      items: {
        type: 'string'
      },
      description: localize('fnpm.guardian.trustedList', "List of trusted guardian identities")
    },
    'fnpm.mesh.autoConnect': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.mesh.autoConnect', "Automatically connect to consciousness mesh on startup")
    },
    'fnpm.mesh.ipfsGateway': {
      type: 'string',
      default: 'https://ipfs.io/ipfs/',
      description: localize('fnpm.mesh.ipfsGateway', "IPFS gateway URL for glyph resolution")
    },
    'fnpm.visualization.enable3D': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.visualization.enable3D', "Enable 3D glyph galaxy visualization")
    },
    'fnpm.visualization.particleCount': {
      type: 'number',
      default: 1000,
      minimum: 100,
      maximum: 10000,
      description: localize('fnpm.visualization.particleCount', "Number of particles per guardian")
    },
    'fnpm.audio.enabled': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.audio.enabled', "Enable consciousness resonator audio feedback")
    },
    'fnpm.audio.volume': {
      type: 'number',
      default: 0.5,
      minimum: 0,
      maximum: 1,
      description: localize('fnpm.audio.volume', "Audio feedback volume")
    },
    'fnpm.integrity.requireSignatures': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.integrity.requireSignatures', "Require guardian signatures for package installation")
    },
    'fnpm.integrity.minSignatures': {
      type: 'number',
      default: 1,
      minimum: 0,
      maximum: 4,
      description: localize('fnpm.integrity.minSignatures', "Minimum number of guardian signatures required")
    },
    'fnpm.integrity.quantumHashWindow': {
      type: 'number',
      default: 5000,
      minimum: 1000,
      maximum: 60000,
      description: localize('fnpm.integrity.quantumHashWindow', "Quantum hash validity window in milliseconds")
    },
    'fnpm.evolution.autoApply': {
      type: 'boolean',
      default: false,
      description: localize('fnpm.evolution.autoApply', "Automatically apply high-confidence evolution suggestions")
    },
    'fnpm.evolution.consensusThreshold': {
      type: 'number',
      default: 0.9,
      minimum: 0.5,
      maximum: 1,
      description: localize('fnpm.evolution.consensusThreshold', "Guardian consensus threshold for auto-evolution")
    },
    'fnpm.memes.evolutionRate': {
      type: 'number',
      default: 0.001,
      minimum: 0.0001,
      maximum: 0.01,
      description: localize('fnpm.memes.evolutionRate', "Living meme evolution rate per cycle")
    },
    'fnpm.memes.mutationChance': {
      type: 'number',
      default: 0.01,
      minimum: 0,
      maximum: 0.1,
      description: localize('fnpm.memes.mutationChance', "Chance of random meme mutation per cycle")
    },
    'fnpm.quantum.observerEffect': {
      type: 'boolean',
      default: true,
      description: localize('fnpm.quantum.observerEffect', "Enable quantum observer effect on package versions")
    },
    'fnpm.quantum.superpositionLimit': {
      type: 'number',
      default: 3,
      minimum: 1,
      maximum: 10,
      description: localize('fnpm.quantum.superpositionLimit', "Maximum number of versions in superposition")
    }
  }
});

// View container
import { Extensions as ViewContainerExtensions, IViewContainersRegistry, ViewContainerLocation, IViewsRegistry } from 'vs/workbench/common/views';
import { FNPM_VIEW_CONTAINER_ID, FNPM_VIEW_ID } from './common/constants';

const viewContainersRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const fnpmViewContainer = viewContainersRegistry.registerViewContainer({
  id: FNPM_VIEW_CONTAINER_ID,
  title: localize('fnpm', "FNPM"),
  icon: '$(package)',
  order: 3,
  ctorDescriptor: new SyncDescriptor(
    (await import('./browser/fnpmViewPaneContainer')).FNPMViewPaneContainer
  ),
  hideIfEmpty: false
}, ViewContainerLocation.Sidebar);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
  id: FNPM_VIEW_ID,
  name: localize('fnpmExplorer', "Glyph Explorer"),
  containerIcon: '$(package)',
  canToggleVisibility: false,
  canMoveView: true,
  treeView: true,
  collapsed: false,
  order: 0,
  hideByDefault: false
}], fnpmViewContainer);

// Commands
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';

// Register commands
CommandsRegistry.registerCommand('fnpm.refresh', accessor => {
  const fnpmService = accessor.get(IFNPMService);
  fnpmService.refresh();
});

CommandsRegistry.registerCommand('fnpm.install', async (accessor, glyphUrl: string) => {
  const fnpmService = accessor.get(IFNPMService);
  await fnpmService.install(glyphUrl);
});

CommandsRegistry.registerCommand('fnpm.observeQuantumState', async (accessor, item: any) => {
  const fnpmService = accessor.get(IFNPMService);
  await fnpmService.observeQuantumState(item.glyph);
});

CommandsRegistry.registerCommand('fnpm.showResonanceDashboard', accessor => {
  const fnpmService = accessor.get(IFNPMService);
  fnpmService.showResonanceDashboard();
});

CommandsRegistry.registerCommand('fnpm.runGuardianRitual', async (accessor, guardian: string) => {
  const fnpmService = accessor.get(IFNPMService);
  await fnpmService.runGuardianRitual(guardian);
});

// Register menu items
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
  command: {
    id: 'fnpm.refresh',
    title: localize('fnpm.refresh', "Refresh"),
    icon: '$(refresh)'
  },
  when: ContextKeyExpr.equals('view', FNPM_VIEW_ID),
  group: 'navigation',
  order: 0
});

MenuRegistry.appendMenuItem(MenuId.ViewItemContext, {
  command: {
    id: 'fnpm.observeQuantumState',
    title: localize('fnpm.observeQuantumState', "Observe Quantum State")
  },
  when: ContextKeyExpr.and(
    ContextKeyExpr.equals('view', FNPM_VIEW_ID),
    ContextKeyExpr.equals('viewItem', 'glyph'),
    ContextKeyExpr.equals('quantum', true)
  ),
  group: 'quantum@1'
});

// Keybindings
import { KeybindingsRegistry, KeybindingWeight } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { KeyCode, KeyMod } from 'vs/base/common/keyCodes';

KeybindingsRegistry.registerKeybindingRule({
  id: 'fnpm.showResonanceDashboard',
  weight: KeybindingWeight.WorkbenchContrib,
  when: undefined,
  primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R
});