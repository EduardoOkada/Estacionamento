# Iguatemi Smart Parking

Protótipo web mobile-first para a reserva antecipada de vagas de estacionamento da Rede Iguatemi.

## Executar

Abra o arquivo `index.html` diretamente em um navegador moderno, ou execute um servidor local:

```bash
python3 -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

## Fluxo

1. Informe o shopping, a data e o horário de chegada.
2. Escolha entre mapa interativo ou indicação automática.
3. Selecione uma vaga disponível no mapa ou aceite a indicação automatizada.
4. Confira a reserva, o valor vantajoso e o QR Code de acesso.

## Recursos

- Layout responsivo em primeiro lugar para celular.
- Fluxo completo de reserva com navegação entre telas.
- Mapa interativo de vagas disponíveis e ocupadas.
- Simulação de carregamento da indicação automática.
- Resumo final com QR Code de acesso.
- Regras de acessibilidade e redução de movimento.