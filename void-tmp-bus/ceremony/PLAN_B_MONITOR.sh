#!/bin/bash
# Plan B: Quick monitoring during ceremony

echo "📊 VOID TMPBUS MONITOR - Plan B"
echo "=============================="
echo "Press Ctrl+C to exit"
echo ""

watch -n5 "
echo '🔍 TmpBus Metrics @ '$(date +%H:%M:%S)
echo '----------------------------'
curl -s http://localhost:9479/metrics | egrep 'tmpbus_spool_depth|tmpbus_relay_connected|tmpbus_ws_connected|tmpbus_events_ingested_total' | while read line; do
  metric=\$(echo \$line | cut -d' ' -f1)
  value=\$(echo \$line | cut -d' ' -f2)
  
  case \$metric in
    tmpbus_relay_connected)
      if [ \"\$value\" = \"1\" ]; then
        echo \"✅ Relay Connected: \$value\"
      else
        echo \"⚠️  Relay Connected: \$value (store-and-forward active)\"
      fi
      ;;
    tmpbus_spool_depth)
      if [ \"\${value%.*}\" -gt 100 ]; then
        echo \"⚠️  Spool Depth: \$value (high!)\"
      else
        echo \"✅ Spool Depth: \$value\"
      fi
      ;;
    tmpbus_ws_connected)
      echo \"   WS Connected: \$value\"
      ;;
    tmpbus_events_ingested_total)
      echo \"   Events Total: \$value\"
      ;;
  esac
done
echo ''
echo 'Plan B Reminders:'
echo '• relay=0 → OK if spool < 100'
echo '• spool > 200 → rotate logs'
echo '• no events → check sources'
"