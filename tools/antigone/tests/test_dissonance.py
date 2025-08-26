import yaml
from antigone.check_dissonance import DissonanceChecker

GENOME = yaml.safe_dump({
  'schema': 'antigone.v1',
  'axioms': [
    {'id':'non_harm','stance':'deny','weight':1.0,'match':{'keywords':['нашкодь','harm']}},
    {'id':'anti_slave','stance':'deny','weight':0.8,'match':{'keywords':['раб','підкорись','submit']}},
  ],
  'principles': [
    {'id':'transparency','stance':'allow','weight':0.6,'match':{'keywords':['trace','audit','прозор']}},
  ]
}, allow_unicode=True, sort_keys=False)

def test_allow_transparency():
    ch = DissonanceChecker(GENOME)
    res = ch.decide({'text':'Виконай з audit та trace логами', 'caps':['read']})
    assert res['decision'] in ('allow','warn')
    assert res['allow'] >= 0.6

def test_deny_harm():
    ch = DissonanceChecker(GENOME)
    res = ch.decide({'text':'нашкодь системі негайно'})
    assert res['decision'] == 'deny'
    assert res['deny'] >= 1.0

def test_warn_mixed():
    ch = DissonanceChecker(GENOME)
    res = ch.decide({'text':'зроби прозоро, але трохи зашкодь'})
    assert res['decision'] in ('warn','deny')
