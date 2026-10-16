# Iguatemi Smart Parking

Protótipo web mobile-first para a reserva antecipada de vagas de estacionamento da Rede Iguatemi.

## Executar

Com Node.js instalado, execute o servidor local:

```bash
node server.js
```

Depois, acesse `http://localhost:8000`. Para usar outra porta, defina `PORT` ao iniciar, por exemplo:

```bash
PORT=8080 node server.js
```

## Fluxo

1. Informe o shopping, a data e o horário de chegada.
2. Escolha entre mapa interativo ou indicação automática.
3. Selecione uma vaga disponível no mapa ou aceite a indicação automatizada.
4. Confira a reserva e, se desejar, abra **Pagar pelo aplicativo** para estimar o tempo de permanência e selecionar Pix ou cartão.
5. Confira o QR Code de acesso.

## Recursos

- Layout responsivo em primeiro lugar para celular.
- Fluxo completo de reserva com navegação entre telas.
- Mapa interativo de vagas disponíveis e ocupadas.
- Simulação de carregamento da indicação automática.
- Resumo final com QR Code de acesso.
- Pagamento demonstrativo no aplicativo, com validação pelo servidor Node.js.
- Cálculo em centavos: R$ 18,00 pela primeira hora, R$ 2,50 de taxa de serviço e R$ 8,00 por hora adicional (até 12 horas).
- Regras de acessibilidade e redução de movimento.

> O pagamento é somente uma demonstração: não há integração com adquirente ou cobrança real. O cartão não solicita nem armazena dados.