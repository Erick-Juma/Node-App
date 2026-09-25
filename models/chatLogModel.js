import { db } from '../config/db.js';
import platformMapper from '../config/platformMapper.js';

export const getAllChatLogs = async () => {
  const { rows } = await db.query('SELECT * FROM chatbot_logs');
  return rows;
};

// convert the project entries to lower case
export const getChatLogByPlatform = async (id) => {
  const convertedId = parseInt(id, 10);
  const { rows } = await db.query(
    'SELECT * FROM chatbot_logs WHERE LOWER(project) = $1',
    [platformMapper.get(convertedId)]
  );
  return rows;
};

export const createChatLog = async (message, user_id, project, remote_ip, course_id = null, course = null) => {
  const lowerProject = project.toLowerCase();

  const { rows } = await db.query(
    'INSERT INTO chatbot_logs (message, user_id, project, remote_ip, course_id, course) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [message, user_id, lowerProject, remote_ip, course_id, course]
  );

  return { id: rows[0].id, message, user_id, project: lowerProject, remote_ip, course_id, course };
};

export const updateChatLog = async (id, name, email) => {
  await db.query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [
    name,
    email,
    id,
  ]);
  return { id, name, email };
};

export const deleteChatLog = async (id) => {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
  return { message: 'User deleted successfully' };
};