#!/bin/sh
# Confere um XML de evento do eSocial contra o XSD oficial. Uso: scripts/validar-esocial.sh arquivo.xml
set -e
DIR="$(cd "$(dirname "$0")/../esquemas/esocial-S-1.3" && pwd)"
case "$(grep -o 'evt[A-Za-z]*/v_S' "$1" | head -1)" in
  evtCAT/*) XSD=evtCAT.xsd ;; evtAfastTemp/*) XSD=evtAfastTemp.xsd ;; evtMonit/*) XSD=evtMonit.xsd ;; evtExpRisco/*) XSD=evtExpRisco.xsd ;;
  evtToxic/*) XSD=evtToxic.xsd ;; evtExclusao/*) XSD=evtExclusao.xsd ;;
  *) echo "Evento não reconhecido em $1"; exit 1 ;;
esac
xmllint --noout --schema "$DIR/$XSD" "$1"
