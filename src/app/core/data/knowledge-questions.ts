export interface KnowledgeQuestion {
  id: number;
  question: string;
  options: string[];
}

export const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  { id: 0,  question: '¿Cuál es tu color favorito?',                          options: ['Azul', 'Rojo', 'Verde', 'Rosa/Morado'] },
  { id: 1,  question: '¿Cuál es tu estación del año favorita?',               options: ['Verano', 'Otoño', 'Invierno', 'Primavera'] },
  { id: 2,  question: '¿Cómo preferís relajarte?',                            options: ['Ver series', 'Escuchar música', 'Leer', 'Salir a caminar'] },
  { id: 3,  question: '¿Cómo preferís pasar un sábado libre?',                options: ['En casa descansando', 'Con amigos', 'De paseo o viaje', 'Haciendo algo creativo'] },
  { id: 4,  question: '¿Cuál es tu comida favorita?',                         options: ['Pizza', 'Sushi/Oriental', 'Pasta', 'Parrilla/Asado'] },
  { id: 5,  question: '¿Cuál es tu tipo de música favorita?',                 options: ['Pop', 'Rock', 'Urbano/Reggaeton', 'Baladas/Romántica'] },
  { id: 6,  question: '¿Cuál es tu tipo de película favorita?',               options: ['Comedia', 'Romance', 'Acción/Aventura', 'Ciencia ficción'] },
  { id: 7,  question: '¿En qué momento del día sos más productivo/a?',        options: ['De mañana', 'Al mediodía', 'Por la tarde', 'De noche'] },
  { id: 8,  question: '¿Cuál es tu bebida favorita?',                         options: ['Café', 'Té', 'Mate', 'Bebidas frías/Jugo'] },
  { id: 9,  question: '¿Qué tipo de viaje preferís?',                         options: ['Playa y mar', 'Montaña y naturaleza', 'Ciudad y cultura', 'Aventura y deportes'] },
  { id: 10, question: '¿Cuál es tu postre favorito?',                         options: ['Chocolate', 'Helado', 'Torta/Pastel', 'Frutas'] },
  { id: 11, question: '¿Qué preferís para una noche especial?',               options: ['Cena romántica afuera', 'Cena en casa', 'Concierto o show', 'Película y sofá'] },
  { id: 12, question: '¿Cuál es tu animal favorito?',                         options: ['Perro', 'Gato', 'Ave', 'Animal exótico'] },
  { id: 13, question: '¿Cómo reaccionás cuando estás estresado/a?',           options: ['Me aíslo', 'Busco compañía', 'Hago ejercicio', 'Como o duermo más'] },
  { id: 14, question: '¿Cuál es tu forma de mostrar amor?',                   options: ['Palabras de cariño', 'Regalos', 'Tiempo de calidad', 'Actos de servicio'] },
  { id: 15, question: '¿Qué actividad física preferís?',                      options: ['Caminar/Correr', 'Gym/Pesas', 'Yoga/Pilates', 'Deportes de equipo'] },
  { id: 16, question: '¿Cuál es tu red social favorita?',                     options: ['Instagram', 'TikTok', 'YouTube', 'WhatsApp/Telegram'] },
  { id: 17, question: '¿Cómo preferís las mañanas?',                          options: ['Silenciosas y tranquilas', 'Con música', 'Activas y rápidas', 'Lento y sin prisa'] },
  { id: 18, question: '¿Cuál es tu emoji favorito?',                          options: ['❤️ / 💕', '😂 / 🤣', '✨ / 🌟', '🔥 / 💯'] },
  { id: 19, question: '¿Cuál es tu desayuno ideal?',                          options: ['Café y tostadas', 'Fruta y yogur', 'Cereal o granola', 'No suelo desayunar'] },
  { id: 20, question: '¿Cuál es tu película animada favorita?',               options: ['El Rey León', 'Toy Story / Pixar', 'Frozen / Disney', 'Studio Ghibli'] },
  { id: 21, question: '¿Qué cosa nunca puede faltarte en el día?',            options: ['Música', 'Café/Mate', 'El celular', 'Ejercicio'] },
  { id: 22, question: '¿Cuál es tu flor favorita?',                           options: ['Rosa', 'Girasol', 'Orquídea', 'Margarita/Otra'] },
  { id: 23, question: '¿Cómo preferís el clima?',                             options: ['Soleado y cálido', 'Nublado y fresco', 'Lluvioso', 'Nevado'] },
  { id: 24, question: '¿Qué tipo de libro preferís?',                         options: ['Romance/Drama', 'Thriller/Misterio', 'Fantasía/Sci-fi', 'No ficción/Autoayuda'] },
  { id: 25, question: '¿Cómo preferís pasar el tiempo libre solo/a?',         options: ['Ver series o películas', 'Leer', 'Jugar videojuegos', 'Salir a caminar'] },
  { id: 26, question: '¿Qué tipo de humor te divierte más?',                  options: ['Absurdo y random', 'Ironía y sarcasmo', 'Memes virales', 'Humor cotidiano'] },
  { id: 27, question: '¿Cómo preferís comunicarte a distancia?',              options: ['Mensajes de texto', 'Audios de voz', 'Llamadas', 'Videollamadas'] },
  { id: 28, question: '¿Cuándo estás de mal humor, qué te ayuda?',            options: ['Que me dejen solo/a', 'Un abrazo', 'Salir y distraerme', 'Comer algo rico'] },
  { id: 29, question: '¿Cuál es tu horario para dormir ideal?',               options: ['Antes de las 22h', 'Entre 22h y 0h', 'Entre 0h y 2h', 'Me acuesto muy tarde'] },
  { id: 30, question: '¿Qué elemento de la naturaleza te representa?',        options: ['Fuego', 'Agua', 'Tierra', 'Aire'] },
  { id: 31, question: '¿Qué tipo de fiesta preferís?',                        options: ['Reunión chica e íntima', 'Fiesta grande y bailable', 'Asado con amigos', 'Prefiero no ir'] },
  { id: 32, question: '¿Qué superpoder elegirías?',                           options: ['Volar', 'Invisibilidad', 'Leer la mente', 'Viajar en el tiempo'] },
  { id: 33, question: '¿Cuál es tu deporte favorito para ver?',               options: ['Fútbol', 'Tenis', 'Basketball', 'Fórmula 1'] },
  { id: 34, question: '¿Qué harías con mucho dinero extra?',                  options: ['Viajar por el mundo', 'Invertir y ahorrar', 'Comprar casa', 'Repartir y donar'] },
];
