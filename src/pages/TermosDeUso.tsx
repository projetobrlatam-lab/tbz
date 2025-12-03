import React from 'react';

const TermosDeUso: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-md rounded-lg">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Termos de Uso</h1>

                <div className="prose prose-blue max-w-none text-gray-600">
                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Termos</h2>
                    <p className="mb-4">
                        Ao acessar ao site, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Uso de Licença</h2>
                    <p className="mb-4">
                        É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>modificar ou copiar os materiais;</li>
                        <li>usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
                        <li>tentar descompilar ou fazer engenharia reversa de qualquer software contido no site;</li>
                        <li>remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
                        <li>transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
                    </ul>
                    <p className="mb-4">
                        Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por nós a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrónico ou impresso.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Isenção de responsabilidade</h2>
                    <ul className="list-disc pl-6 mb-4">
                        <li>Os materiais no site são fornecidos 'como estão'. Não oferecemos garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</li>
                        <li>Além disso, não garantimos ou fazemos qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Limitações</h2>
                    <p className="mb-4">
                        Em nenhum caso nós ou nossos fornecedores seremos responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais, mesmo que nós ou um representante autorizado tenhamos sido notificados oralmente ou por escrito da possibilidade de tais danos. Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos conseqüentes ou incidentais, essas limitações podem não se aplicar a você.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">5. Precisão dos materiais</h2>
                    <p className="mb-4">
                        Os materiais exibidos no site podem incluir erros técnicos, tipográficos ou fotográficos. Não garantimos que qualquer material em seu site seja preciso, completo ou atual. Podemos fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, não nos comprometemos a atualizar os materiais.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">6. Links</h2>
                    <p className="mb-4">
                        Não analisamos todos os sites vinculados ao seu site e não somos responsáveis pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por nossa parte do site. O uso de qualquer site vinculado é por conta e risco do usuário.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Modificações</h2>
                    <p className="mb-4">
                        Podemos revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Lei aplicável</h2>
                    <p className="mb-4">
                        Estes termos e condições são regidos e interpretados de acordo com as leis locais e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermosDeUso;
