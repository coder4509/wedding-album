import axios from "axios";

const getWeddingImages = () => {
  return axios.get("http://localhost:3002/api/list-img");
};
export { getWeddingImages };
