# Antigone Rollout Guide

## 1) Staging
- Запустити контейнер із `DECISION_MODE=warn`
- Підключити до `RELAY_BASE`
- Перевірити метрики/алерти

## 2) Canary
- Ввімкнути `gate` для 5–10% маршрутів (через intent-router/resolver у relay)
- Спостерігати deny-rate, p95, відмови

## 3) Prod
- Перемкнути `gate` як дефолт
- Зафіксувати `genome SHA` у релізі

## Rollback
- Повернути `DECISION_MODE=warn` і `docker compose restart void-antigone`
- Зберегти артефакти метрик/логів
