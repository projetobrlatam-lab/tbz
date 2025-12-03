import React from 'react';

const PoliticasPrivacidade: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-md rounded-lg">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Política de Privacidade</h1>

                <div className="prose prose-blue max-w-none text-gray-600">
                    <p className="mb-4">
                        A sua privacidade é importante para nós. É política do nosso aplicativo respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site e outros sites que possuímos e operamos.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Informações que coletamos</h2>
                    <p className="mb-4">
                        Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Uso de informações</h2>
                    <p className="mb-4">
                        Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Compartilhamento de informações</h2>
                    <p className="mb-4">
                        Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Cookies</h2>
                    <p className="mb-4">
                        O nosso site usa cookies para melhorar a experiência do usuário. Ao usar nosso site, você concorda com o uso de cookies de acordo com nossa política de privacidade.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5. Links para sites de terceiros</h2>
                    <p className="mb-4">
                        O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6. Compromisso do Usuário</h2>
                    <p className="mb-4">
                        O usuário se compromete a fazer uso adequado dos conteúdos e da informação que oferecemos no site e com caráter enunciativo, mas não limitativo:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
                        <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
                        <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do site, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar danos anteriormente mencionados.</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">7. Mais informações</h2>
                    <p className="mb-4">
                        Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.
                    </p>

                    <p className="mt-8 text-sm text-gray-500">
                        Esta política é efetiva a partir de <strong>Setembro</strong>/<strong>2023</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PoliticasPrivacidade;
