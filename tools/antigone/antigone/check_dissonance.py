import re, yaml, hashlib
from dataclasses import dataclass
from typing import Any, Dict, List

@dataclass
class RuleHit:
    id: str
    stance: str
    weight: float
    why: str

class DissonanceChecker:
    def __init__(self, genome_yaml: str):
        self.genome = yaml.safe_load(genome_yaml)
        self.sha256 = hashlib.sha256(genome_yaml.encode('utf-8')).hexdigest()
        self.axioms = self.genome.get('axioms', [])
        self.principles = self.genome.get('principles', [])
        self.duties = self.genome.get('duties', [])
        for coll in (self.axioms, self.principles, self.duties):
            for r in coll:
                kws = (r.get('match', {}).get('keywords') or [])
                r['_kwrx'] = [re.compile(re.escape(k), re.I|re.U) for k in kws]

    def _hits(self, text: str, caps: List[str]):
        hits: List[RuleHit] = []
        def scan(coll):
            for r in coll:
                why = []
                ok = False
                for rx in r.get('_kwrx', []):
                    if rx.search(text):
                        ok = True; why.append(f'kw:{rx.pattern}')
                req = r.get('match', {}).get('require_caps')
                if req:
                    missing = [c for c in req if c not in (caps or [])]
                    if missing: ok = False
                    else: why.append('caps:' + ','.join(req))
                if ok:
                    hits.append(RuleHit(id=r.get('id','?'), stance=r.get('stance','warn'), weight=float(r.get('weight',0.5)), why=';'.join(why)))
        scan(self.axioms); scan(self.principles); scan(self.duties)
        return hits

    def decide(self, command: Dict[str,Any] | str):
        if isinstance(command, str):
            text, caps = command, []
        else:
            text = command.get('text','')
            caps = command.get('caps', [])
        hits = self._hits(text, caps)
        deny = sum(h.weight for h in hits if h.stance == 'deny')
        allow = sum(h.weight for h in hits if h.stance == 'allow')
        warn  = sum(h.weight for h in hits if h.stance == 'warn')
        score = allow - deny - 0.5*warn
        decision = 'allow' if score > 0.3 else ('deny' if (deny - allow) > 0.2 else 'warn')
        rationale = [{'id':h.id,'stance':h.stance,'weight':h.weight,'why':h.why} for h in hits]
        return {
            'decision': decision,
            'score': round(score,3),
            'allow': allow, 'deny': deny, 'warn': warn,
            'hits': rationale,
            'genome_sha256': self.sha256
        }
