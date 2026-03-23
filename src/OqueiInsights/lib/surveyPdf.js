export function exportSurveyPDF(survey) {
  const types = {
    boolean: 'Sim / Nao',
    select: 'Escolha Unica',
    multiselect: 'Multipla Escolha',
    nps: 'Escala NPS (0-10)',
    text: 'Texto Livre',
  };

  const triggerLabel = survey.triggerLabel || survey.trigger || 'Nao informado';
  const questionCount = survey.questions?.length || 0;
  const cityLabel = survey.targetCityNames?.length
    ? survey.targetCityNames.join(', ')
    : survey.targetCities?.join(', ') || 'Nao definido';
  const themeLabel = survey.themeNames?.length ? survey.themeNames.join(', ') : 'Sem tema vinculado';

  const questions = (survey.questions || [])
    .map((question, index) => {
      const typeLabel = types[question.type] || question.type;
      const options = Array.isArray(question.options) ? question.options : [];
      const optionsHtml =
        question.type === 'select' || question.type === 'multiselect'
          ? options
              .map(
                (option) => `
                  <div class="option">
                    <span class="mark">${question.type === 'multiselect' ? '[ ]' : '( )'}</span>
                    <span>${option}</span>
                  </div>`,
              )
              .join('')
          : question.type === 'boolean'
            ? `
              <div class="option"><span class="mark">( )</span><span>Sim</span></div>
              <div class="option"><span class="mark">( )</span><span>Nao</span></div>`
            : question.type === 'nps'
              ? `
                <div class="nps-row">
                  ${Array.from({ length: 11 }, (_, n) => `<span class="nps-box">${n}</span>`).join('')}
                </div>`
              : `
                <div class="line"></div>
                <div class="line"></div>
                <div class="line short"></div>`;

      return `
        <section class="question">
          <div class="question-header">
            <span class="index">${index + 1}</span>
            <div>
              <h3>${question.label || 'Pergunta sem texto'}</h3>
              <p>${typeLabel}</p>
            </div>
          </div>
          <div class="question-body">${optionsHtml}</div>
        </section>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${survey.title || 'Pesquisa Oquei Insights'}</title>
      <style>
        @page { margin: 18mm 16mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #0f172a; }
        h1, h2, h3, p { margin: 0; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; margin-bottom: 6px; }
        .subtitle { color: #475569; font-size: 13px; }
        .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
        .meta-item { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; }
        .meta-item strong { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
        .question { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; page-break-inside: avoid; }
        .question-header { display: flex; gap: 12px; margin-bottom: 12px; }
        .question-header .index { width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .question-header h3 { font-size: 15px; line-height: 1.35; }
        .question-header p { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
        .question-body { padding-left: 40px; }
        .option { display: flex; gap: 8px; padding: 6px 0; font-size: 13px; }
        .mark { color: #64748b; min-width: 24px; }
        .nps-row { display: flex; gap: 4px; flex-wrap: wrap; }
        .nps-box { width: 28px; height: 28px; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .line { height: 18px; border-bottom: 1px solid #94a3b8; margin-bottom: 8px; }
        .line.short { width: 60%; }
        .footer { border-top: 1px solid #cbd5e1; margin-top: 26px; padding-top: 10px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <header class="header">
        <h1>${survey.title || 'Pesquisa Oquei Insights'}</h1>
        <p class="subtitle">${survey.description || survey.objective || 'Questionario estruturado para pesquisa de mercado.'}</p>
        <div class="meta">
          <div class="meta-item"><strong>Objetivo</strong><span>${survey.objective || 'Nao informado'}</span></div>
          <div class="meta-item"><strong>Gatilho</strong><span>${triggerLabel}</span></div>
          <div class="meta-item"><strong>Temas</strong><span>${themeLabel}</span></div>
          <div class="meta-item"><strong>Cidades-alvo</strong><span>${cityLabel}</span></div>
          <div class="meta-item"><strong>Versao</strong><span>${survey.questionnaireVersion || 1}</span></div>
          <div class="meta-item"><strong>Perguntas</strong><span>${questionCount}</span></div>
        </div>
      </header>
      ${questions}
      <footer class="footer">
        <span>Oquei Insights</span>
        <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
      </footer>
    </body>
  </html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;';
  document.body.appendChild(frame);
  frame.contentDocument.open();
  frame.contentDocument.write(html);
  frame.contentDocument.close();
  frame.contentWindow.onload = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => document.body.removeChild(frame), 2000);
  };
}
