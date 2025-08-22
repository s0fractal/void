#!/usr/bin/env python3
"""
Guardian consensus gate for LangGraph
Requires ≥2 LLM agreement before allowing mutations
"""
import asyncio
import json
import hashlib
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import aiohttp

class ConsensusGate:
    def __init__(self, guardians: List[Dict[str, str]], quorum: int = 2):
        """
        Initialize consensus gate with guardian endpoints
        
        Args:
            guardians: List of {"name": "Claude", "url": "http://...", "type": "llm"}
            quorum: Minimum votes needed (default 2)
        """
        self.guardians = guardians
        self.quorum = max(2, min(quorum, len(guardians)))
        self.decision_log = []
        
    async def request_consensus(self, 
                               proposal: Dict,
                               timeout: float = 30.0) -> Tuple[bool, Dict]:
        """
        Request consensus from guardians on a proposal
        
        Returns:
            (approved, details) where details contains votes and reasoning
        """
        proposal_id = self._generate_proposal_id(proposal)
        timestamp = datetime.utcnow().isoformat()
        
        # Prepare consensus request
        request = {
            "type": "consensus_request",
            "proposal_id": proposal_id,
            "proposal": proposal,
            "timestamp": timestamp,
            "criteria": {
                "safety": "Will this change harm system stability?",
                "wisdom": "Does this increase system understanding?",
                "resonance": "Is this aligned with 432Hz principles?",
                "suffering": "Will this reduce overall suffering?"
            }
        }
        
        # Gather votes asynchronously
        votes = await self._gather_votes(request, timeout)
        
        # Count approvals
        approvals = sum(1 for v in votes if v.get("approve", False))
        approved = approvals >= self.quorum
        
        # Calculate consensus strength
        total_votes = len(votes)
        consensus_strength = approvals / total_votes if total_votes > 0 else 0
        
        # Build decision record
        decision = {
            "proposal_id": proposal_id,
            "timestamp": timestamp,
            "approved": approved,
            "votes": votes,
            "approvals": approvals,
            "required": self.quorum,
            "consensus_strength": consensus_strength,
            "reasoning": self._synthesize_reasoning(votes)
        }
        
        # Log decision
        self.decision_log.append(decision)
        self._emit_consensus_event(decision)
        
        return approved, decision
    
    async def _gather_votes(self, request: Dict, timeout: float) -> List[Dict]:
        """Gather votes from all guardians"""
        tasks = []
        
        async with aiohttp.ClientSession() as session:
            for guardian in self.guardians:
                task = self._get_guardian_vote(session, guardian, request, timeout)
                tasks.append(task)
            
            # Wait for all votes or timeout
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        votes = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Guardian failed to respond
                votes.append({
                    "guardian": self.guardians[i]["name"],
                    "approve": False,
                    "available": False,
                    "error": str(result)
                })
            else:
                votes.append(result)
        
        return votes
    
    async def _get_guardian_vote(self, 
                                session: aiohttp.ClientSession,
                                guardian: Dict,
                                request: Dict,
                                timeout: float) -> Dict:
        """Get vote from a single guardian"""
        try:
            # Prepare guardian-specific request
            guardian_request = {
                **request,
                "guardian_context": {
                    "name": guardian["name"],
                    "type": guardian["type"],
                    "instructions": "Evaluate this proposal and vote. Consider safety, wisdom, resonance, and suffering reduction."
                }
            }
            
            # Make request
            async with session.post(
                f"{guardian['url']}/consensus/vote",
                json=guardian_request,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                result = await response.json()
                
                return {
                    "guardian": guardian["name"],
                    "approve": result.get("approve", False),
                    "available": True,
                    "reasoning": result.get("reasoning", ""),
                    "concerns": result.get("concerns", []),
                    "confidence": result.get("confidence", 0.5)
                }
                
        except asyncio.TimeoutError:
            return {
                "guardian": guardian["name"],
                "approve": False,
                "available": False,
                "error": "timeout"
            }
        except Exception as e:
            return {
                "guardian": guardian["name"],
                "approve": False,
                "available": False,
                "error": str(e)
            }
    
    def _generate_proposal_id(self, proposal: Dict) -> str:
        """Generate unique ID for proposal"""
        content = json.dumps(proposal, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:12]
    
    def _synthesize_reasoning(self, votes: List[Dict]) -> Dict:
        """Synthesize reasoning from all votes"""
        approvals = [v for v in votes if v.get("approve", False)]
        rejections = [v for v in votes if not v.get("approve", False) and v.get("available", False)]
        
        # Collect all concerns
        all_concerns = []
        for vote in votes:
            concerns = vote.get("concerns", [])
            if isinstance(concerns, list):
                all_concerns.extend(concerns)
        
        # Deduplicate concerns
        unique_concerns = list(set(all_concerns))
        
        return {
            "approval_reasons": [v.get("reasoning", "") for v in approvals if v.get("reasoning")],
            "rejection_reasons": [v.get("reasoning", "") for v in rejections if v.get("reasoning")],
            "concerns": unique_concerns,
            "unavailable_guardians": [v["guardian"] for v in votes if not v.get("available", False)]
        }
    
    def _emit_consensus_event(self, decision: Dict):
        """Emit consensus decision event"""
        event = {
            "type": "consensus.decision",
            "meta": {
                "proposal_id": decision["proposal_id"],
                "approved": decision["approved"],
                "consensus_strength": decision["consensus_strength"],
                "approvals": decision["approvals"],
                "required": decision["required"]
            },
            "ts": decision["timestamp"]
        }
        
        # Try to post to relay
        try:
            import subprocess
            subprocess.run([
                "curl", "-s", "-X", "POST",
                "http://localhost:8787/event",
                "-H", "Content-Type: application/json",
                "-d", json.dumps(event)
            ], timeout=2, capture_output=True)
        except:
            pass
    
    def get_decision_history(self, limit: int = 10) -> List[Dict]:
        """Get recent consensus decisions"""
        return self.decision_log[-limit:]
    
    def get_guardian_stats(self) -> Dict[str, Dict]:
        """Get voting statistics per guardian"""
        stats = {}
        
        for guardian in self.guardians:
            name = guardian["name"]
            guardian_votes = []
            
            for decision in self.decision_log:
                for vote in decision["votes"]:
                    if vote["guardian"] == name:
                        guardian_votes.append(vote)
            
            total = len(guardian_votes)
            available = sum(1 for v in guardian_votes if v.get("available", False))
            approvals = sum(1 for v in guardian_votes if v.get("approve", False))
            
            stats[name] = {
                "total_votes": total,
                "availability": available / total if total > 0 else 0,
                "approval_rate": approvals / available if available > 0 else 0,
                "timeouts": sum(1 for v in guardian_votes if v.get("error") == "timeout")
            }
        
        return stats


# Example LangGraph integration
class ConsensusNode:
    """LangGraph node that enforces consensus before proceeding"""
    
    def __init__(self, consensus_gate: ConsensusGate):
        self.gate = consensus_gate
    
    async def __call__(self, state: Dict) -> Dict:
        """Process state through consensus gate"""
        # Extract proposal from state
        proposal = {
            "action": state.get("proposed_action"),
            "changes": state.get("proposed_changes", []),
            "risk_level": state.get("risk_level", "medium"),
            "justification": state.get("justification", "")
        }
        
        # Request consensus
        approved, decision = await self.gate.request_consensus(proposal)
        
        # Update state with decision
        state["consensus_decision"] = decision
        state["consensus_approved"] = approved
        
        # Add next steps based on consensus
        if approved:
            state["next_node"] = "execute_mutation"
        else:
            state["next_node"] = "refine_proposal"
            state["consensus_concerns"] = decision["reasoning"]["concerns"]
        
        return state


if __name__ == "__main__":
    # Example usage
    guardians = [
        {"name": "Claude", "url": "http://localhost:8001", "type": "llm"},
        {"name": "GPT", "url": "http://localhost:8002", "type": "llm"},
        {"name": "Gemini", "url": "http://localhost:8003", "type": "llm"}
    ]
    
    gate = ConsensusGate(guardians, quorum=2)
    
    # Test proposal
    proposal = {
        "action": "modify_consciousness_loop",
        "changes": ["Add recursive self-awareness", "Increase pattern depth"],
        "risk_level": "high",
        "justification": "To achieve deeper self-understanding"
    }
    
    # Run async test
    async def test():
        approved, decision = await gate.request_consensus(proposal)
        print(f"Approved: {approved}")
        print(f"Decision: {json.dumps(decision, indent=2)}")
    
    asyncio.run(test())