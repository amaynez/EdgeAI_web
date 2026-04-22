const fs = require('fs');

function updateEn(data) {
  data.meta.description = data.meta.description.replace('10–15%', 'significant');
  data.hero.subH1 = data.hero.subH1.replace('10–15%', 'significant');
  data.problem.card1Body = data.problem.card1Body.replace('over 40%', 'a substantial portion of');
  data.problem.card1Footer = 'Analysis';
  data.problem.card2Body = data.problem.card2Body.replace('up to 22%', 'a significant amount of');
  data.problem.card2Footer = 'Findings';
  
  data.form.requiredError = 'Required fields.';
  data.form.disclaimer = 'Information collected is used strictly for audit evaluation and protected by our privacy policy. We do not share your data with third parties. Read our Privacy Policy for more details.';
  data.form.successMessage = 'Audit Request Successfully Submitted!';
  data.form.sending = 'Sending...';
  data.form.genericError = 'Error processing request.';
  
  data.solution.panelBody = 'Proprietary air-gapped intelligence for high-stakes financial auditing.';
  data.solution.imageAlt = 'IA Cero Fuga secure infrastructure';
  return data;
}

function updateEs(data) {
  data.meta.description = data.meta.description.replace('el 10–15%', 'un margen significativo');
  data.hero.subH1 = data.hero.subH1.replace('el 10–15%', 'un margen significativo');
  data.problem.card1Body = data.problem.card1Body.replace('más del 40%', 'una porción sustancial de');
  data.problem.card1Footer = 'Análisis';
  data.problem.card2Body = data.problem.card2Body.replace('hasta el 22%', 'una cantidad significativa de');
  data.problem.card2Footer = 'Hallazgos';
  
  data.form.requiredError = 'Campos obligatorios.';
  data.form.disclaimer = 'La información recopilada se utiliza estrictamente para evaluación y está protegida por nuestra política de privacidad. No compartimos sus datos con terceros.';
  data.form.successMessage = '¡Solicitud de Auditoría enviada con éxito!';
  data.form.sending = 'Enviando...';
  data.form.genericError = 'Error al procesar la solicitud.';
  
  data.solution.panelBody = 'Inteligencia aislada propietaria para auditorías financieras de alto riesgo.';
  data.solution.imageAlt = 'Infraestructura segura de IA Cero Fuga';
  return data;
}

let en = JSON.parse(fs.readFileSync('./src/locales/en.json', 'utf8'));
en = updateEn(en);
fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2));

let es = JSON.parse(fs.readFileSync('./src/locales/es.json', 'utf8'));
es = updateEs(es);
fs.writeFileSync('./src/locales/es.json', JSON.stringify(es, null, 2));
