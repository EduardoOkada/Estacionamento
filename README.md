# Iguatemi Smart Parking

Protótipo web mobile-first para a reserva antecipada de vagas de estacionamento da Rede Iguatemi.

## Executar

Abra `index.html` em um navegador moderno, ou rode um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Fluxo

1. Informe shopping, data, horário e placa do veículo.
2. Escolha entre mapa interativo ou indicação automática.
3. Selecione uma vaga no mapa ou aceite a vaga indicada.
4. Confira a reserva, o valor ilustrativo e o QR Code demonstrativo. É possível cancelar a reserva.

## Melhorias desta versão

- **Indicação automática funcional:** o sistema escolhe a primeira vaga disponível, mostra a vaga indicada e só então libera "Aceitar e Prosseguir".
- **Vaga reservada (azul):** após confirmar, a vaga fica reservada no mapa e não pode ser escolhida de novo, conforme os estados do projeto (verde livre, vermelho ocupada, azul reservada). Cada vaga mostra também ícone (✓, ✕, ●), sem depender só da cor.
- **Placa do veículo** no formulário, com máscara (ABC-1D23 ou ABC-1234), base para a leitura de placa prevista no projeto.
- **Validação:** não aceita horário passado nem placa inválida; o horário padrão é a próxima meia hora.
- **Navegação coerente:** botão voltar funcional (oculto na tela inicial), "Reserva" só habilita com reserva ativa, "Mapa" exige o formulário preenchido. O botão de notificações, sem função, foi removido.
- **Preço claro:** a confirmação mostra valet, valor pago e economia, com aviso de que são valores ilustrativos.
- **Cancelar reserva**, que libera a vaga; a reserva ativa persiste ao recarregar a página (localStorage).
- **Acessibilidade:** vagas são botões com `aria-label` e `aria-pressed`; foco move para o título de cada tela; anúncios via `aria-live`; contraste de cores e tamanhos mínimos de fonte revisados.
- **Correções:** cartões que eram comprimidos quando a tela rolava; texto "instantly" para "instantaneamente"; QR Code identificado como demonstrativo.

## Limitações (protótipo)

- A disponibilidade das vagas é fixa e não depende de shopping, data ou horário.
- Não há sensores, leitura real de placa, pagamento ou login; o QR Code é ilustrativo.
- Os valores de preço são de demonstração, não tarifas oficiais.
