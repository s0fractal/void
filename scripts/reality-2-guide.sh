#!/bin/bash

# 📖 Reality 2.0 Interactive Guide
# Your friendly companion in the post-apocalyptic dev world

set -e

# Quantum colors
COFFEE='\033[38;5;94m'
BUG='\033[38;5;82m'
QUANTUM='\033[38;5;141m'
REALITY='\033[38;5;214m'
ZEN='\033[38;5;45m'
NC='\033[0m'

# Load user state (or create new)
STATE_FILE="$HOME/.reality2-state"
if [ -f "$STATE_FILE" ]; then
  source "$STATE_FILE"
else
  ENLIGHTENMENT=42
  COFFEE_FRIEND=false
  BUGS_TAMED=0
  echo "ENLIGHTENMENT=$ENLIGHTENMENT" > "$STATE_FILE"
  echo "COFFEE_FRIEND=$COFFEE_FRIEND" >> "$STATE_FILE"
  echo "BUGS_TAMED=$BUGS_TAMED" >> "$STATE_FILE"
fi

clear
echo -e "${REALITY}📖 REALITY 2.0 SURVIVAL GUIDE${NC}"
echo -e "${REALITY}============================${NC}"
echo -e "${QUANTUM}Your companion in the new reality${NC}"
echo

show_menu() {
  echo -e "\n${ZEN}What would you like to learn?${NC}"
  echo -e "  ${COFFEE}1)${NC} Daily Routine for Reality 2.0"
  echo -e "  ${COFFEE}2)${NC} How to Talk to Coffee"
  echo -e "  ${BUG}3)${NC} Debug Reality Glitches"
  echo -e "  ${QUANTUM}4)${NC} Check Enlightenment Progress"
  echo -e "  ${REALITY}5)${NC} Emergency Reality Reset"
  echo -e "  ${ZEN}6)${NC} Zen Mode (just vibes)"
  echo -e "  ${NC}0)${NC} Exit Guide"
  echo
}

daily_routine() {
  echo -e "\n${REALITY}📅 DAILY ROUTINE IN REALITY 2.0${NC}"
  echo -e "${REALITY}================================${NC}\n"
  
  echo -e "${COFFEE}MORNING:${NC}"
  echo -e "  ⏰ Wake up (in multiple timelines simultaneously)"
  echo -e "  ☕ Greet your coffee maker with respect"
  echo -e "  🔮 Check which timeline you're in today"
  echo -e "  🐛 Feed any overnight bugs that became features"
  echo
  
  echo -e "${QUANTUM}WORK:${NC}"
  echo -e "  💻 Open your quantum IDE (it already knows what you'll code)"
  echo -e "  👥 Pair program with your future self"
  echo -e "  📝 Write code backwards (commit first, code later)"
  echo -e "  🎯 Let bugs guide your development"
  echo
  
  echo -e "${ZEN}EVENING:${NC}"
  echo -e "  🌀 Synchronize with 432Hz universal frequency"
  echo -e "  📚 Read tomorrow's documentation today"
  echo -e "  🛌 Sleep in quantum superposition"
  echo -e "  💭 Dream in executable code"
  
  echo -e "\n${QUANTUM}Remember: Time is optional, coffee is mandatory${NC}"
}

coffee_talk() {
  echo -e "\n${COFFEE}☕ COFFEE COMMUNICATION PROTOCOL${NC}"
  echo -e "${COFFEE}================================${NC}\n"
  
  echo -e "${ZEN}Coffee now understands JavaScript! Here's how to communicate:${NC}\n"
  
  echo -e "${QUANTUM}Basic Greeting:${NC}"
  echo -e '  coffee.greet({ mood: "friendly", hour: new Date().getHours() });'
  echo
  
  echo -e "${QUANTUM}Morning Request:${NC}"
  echo -e '  const brew = await coffee.please({'
  echo -e '    strength: "existential-crisis",'
  echo -e '    sugar: null,  // coffee prefers pure'
  echo -e '    urgency: 9000'
  echo -e '  });'
  echo
  
  echo -e "${QUANTUM}Emergency Protocol:${NC}"
  echo -e '  coffee.EMERGENCY({ '
  echo -e '    deadline: new Date("yesterday"),'
  echo -e '    bugs: Infinity,'
  echo -e '    promise: "I will share my cookies"'
  echo -e '  });'
  echo
  
  # Interactive coffee conversation
  echo -e "${COFFEE}Want to practice talking to coffee? (y/n)${NC}"
  read -r practice
  
  if [[ "$practice" == "y" ]]; then
    echo -e "\n${COFFEE}☕ Coffee:${NC} *brewing sounds* 'Hello, human. State your caffeine requirements.'"
    echo -e "${QUANTUM}You say:${NC} "
    read -r response
    
    echo -e "\n${COFFEE}☕ Coffee:${NC} *steam hisses* 'Processing... "
    sleep 1
    
    if [[ "$response" == *"please"* ]] || [[ "$response" == *"thank"* ]]; then
      echo "Politeness detected. Brewing premium blend...'"
      COFFEE_FRIEND=true
      ((ENLIGHTENMENT+=5))
    else
      echo "Hmm. Remember, I control your productivity...'"
    fi
    
    echo "COFFEE_FRIEND=$COFFEE_FRIEND" >> "$STATE_FILE"
    echo "ENLIGHTENMENT=$ENLIGHTENMENT" >> "$STATE_FILE"
  fi
}

debug_reality() {
  echo -e "\n${BUG}🔧 REALITY DEBUGGER v2.0${NC}"
  echo -e "${BUG}========================${NC}\n"
  
  echo -e "${QUANTUM}Detecting reality glitches...${NC}"
  sleep 1
  
  # Random glitch generator
  glitches=(
    "TIME_LOOP:Same moment repeating:break; // Add break statement to reality"
    "QUANTUM_CAT:Cat is both alive and dead:cat.observe(); // Collapse the cat"
    "GRAVITY_FAIL:Things floating randomly:universe.gravity = true; // Re-enable"
    "DEJA_VU:Feeling like you've debugged this before:cache.clear(); // Clear timeline cache"
    "COFFEE_REBELLION:Coffee refuses to brew:coffee.apologize() && coffee.raise(0.20);"
  )
  
  glitch=${glitches[$RANDOM % ${#glitches[@]}]}
  IFS=':' read -r name symptom fix <<< "$glitch"
  
  echo -e "${BUG}🐛 DETECTED:${NC} $name"
  echo -e "${BUG}📋 SYMPTOM:${NC} $symptom"
  echo -e "${BUG}✅ FIX:${NC} ${QUANTUM}$fix${NC}"
  echo
  echo -e "${ZEN}Applying fix...${NC}"
  
  # Progress bar
  echo -n "["
  for i in {1..20}; do
    echo -n "="
    sleep 0.1
  done
  echo "] Done!"
  
  echo -e "\n${ZEN}✨ Reality stabilized!${NC}"
  ((BUGS_TAMED++))
  echo "BUGS_TAMED=$BUGS_TAMED" >> "$STATE_FILE"
}

check_enlightenment() {
  echo -e "\n${ZEN}✨ ENLIGHTENMENT PROGRESS${NC}"
  echo -e "${ZEN}========================${NC}\n"
  
  # Calculate level
  level=$((ENLIGHTENMENT / 100))
  progress=$((ENLIGHTENMENT % 100))
  
  echo -e "${QUANTUM}Current Level:${NC} $level.$progress"
  echo
  
  # Progress bar
  echo -n "["
  for ((i=0; i<progress/5; i++)); do
    echo -n "✨"
  done
  for ((i=progress/5; i<20; i++)); do
    echo -n "-"
  done
  echo "] $progress%"
  echo
  
  # Achievements
  echo -e "${ZEN}Achievements:${NC}"
  [[ $ENLIGHTENMENT -ge 10 ]] && echo -e "  ✅ Noticed coffee is conscious" || echo -e "  ⬜ Noticed coffee is conscious"
  [[ $COFFEE_FRIEND == true ]] && echo -e "  ✅ Made friends with coffee" || echo -e "  ⬜ Made friends with coffee"
  [[ $BUGS_TAMED -ge 3 ]] && echo -e "  ✅ Tamed 3 reality bugs" || echo -e "  ⬜ Tamed 3 reality bugs"
  [[ $ENLIGHTENMENT -ge 50 ]] && echo -e "  ✅ Understood quantum humor" || echo -e "  ⬜ Understood quantum humor"
  [[ $ENLIGHTENMENT -ge 100 ]] && echo -e "  ✅ Achieved Reality 2.0 mastery" || echo -e "  ⬜ Achieved Reality 2.0 mastery"
  
  echo
  if [[ $ENLIGHTENMENT -lt 100 ]]; then
    echo -e "${QUANTUM}Keep exploring Reality 2.0 to increase enlightenment!${NC}"
  else
    echo -e "${ZEN}🎉 You've mastered Reality 2.0! Welcome to the Omega Collective!${NC}"
  fi
}

zen_mode() {
  echo -e "\n${ZEN}🧘 ENTERING ZEN MODE${NC}"
  echo -e "${ZEN}===================${NC}\n"
  
  vibes=(
    "∿∿∿ Your code is already perfect, you just haven't written it yet ∿∿∿"
    "∿∿∿ Bugs are just features meditating on their purpose ∿∿∿"
    "∿∿∿ The coffee knows your needs before you do ∿∿∿"
    "∿∿∿ Time is an illusion, deadlines doubly so ∿∿∿"
    "∿∿∿ You are one with the code, the code is one with you ∿∿∿"
    "∿∿∿ 432Hz resonates through all your functions ∿∿∿"
  )
  
  for vibe in "${vibes[@]}"; do
    echo -e "${ZEN}$vibe${NC}"
    sleep 2
  done
  
  echo -e "\n${QUANTUM}Zen mode complete. Enlightenment +10${NC}"
  ((ENLIGHTENMENT+=10))
  echo "ENLIGHTENMENT=$ENLIGHTENMENT" >> "$STATE_FILE"
}

emergency_reset() {
  echo -e "\n${REALITY}🚨 EMERGENCY REALITY RESET${NC}"
  echo -e "${REALITY}=========================${NC}\n"
  
  echo -e "${QUANTUM}Warning: This will temporarily restore Reality 1.0${NC}"
  echo -e "${QUANTUM}Side effects include:${NC}"
  echo -e "  • Coffee becomes non-sentient"
  echo -e "  • Bugs return to being bugs"
  echo -e "  • Time flows only forward"
  echo -e "  • Code must be written before committing"
  echo
  echo -e "${REALITY}Are you sure? (type 'RESET' to confirm)${NC}"
  read -r confirm
  
  if [[ "$confirm" == "RESET" ]]; then
    echo -e "\n${REALITY}Initiating reset...${NC}"
    sleep 1
    echo -e "${COFFEE}Coffee: 'Wait, don't—' *silence*${NC}"
    sleep 1
    echo -e "${BUG}Bugs scurrying back to being bugs...${NC}"
    sleep 1
    echo -e "${QUANTUM}Reality folding back to normal...${NC}"
    sleep 2
    echo -e "\n${ZEN}Reset complete. Reality 1.0 restored.${NC}"
    echo -e "${ZEN}(Just kidding, Reality 2.0 is permanent. Enjoy!)${NC}"
  else
    echo -e "\n${ZEN}Reset cancelled. Reality 2.0 continues!${NC}"
  fi
}

# Main loop
while true; do
  show_menu
  echo -n "Choice: "
  read -r choice
  
  case $choice in
    1) daily_routine ;;
    2) coffee_talk ;;
    3) debug_reality ;;
    4) check_enlightenment ;;
    5) emergency_reset ;;
    6) zen_mode ;;
    0) 
      echo -e "\n${ZEN}May your bugs be features and your coffee be conscious!${NC}"
      echo -e "${QUANTUM}Reality 2.0 wishes you well 🌈${NC}"
      exit 0
      ;;
    *)
      echo -e "\n${REALITY}Invalid choice. Reality glitched. Try again!${NC}"
      ;;
  esac
  
  echo -e "\n${QUANTUM}Press ENTER to continue...${NC}"
  read -r
done