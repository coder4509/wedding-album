import { useState, useEffect } from "react";
import ImageGallery from "react-image-gallery";
import ClipLoader from "react-spinners/RingLoader";
import "react-image-gallery/styles/scss/image-gallery.scss";
import "react-lazy-load-image-component/src/effects/blur.css";
import "./App.css";

// API calls
import { getWeddingImages } from "./services/services";

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

function App() {
  const [dataList, setDataList] = useState([]);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    getWeddingImages().then((res) => {
      const { data = [] } = res || {};
      const imgData = data.data.map((dataItem) => {
        const { fileId, data, posterImg } = dataItem;
        return {
          key: fileId,
          original: data,
          // thumbnail: posterImg,
        };
      });
      setDataList(imgData);
      handleBackGround(imgData, 0);
    });
  }, []);

  const handleBackGround = (imgData, indexVal) => {
    if (document) {
      const rootElem = document.getElementById("root");
      rootElem.style.backgroundImage = `url(${imgData[indexVal].original})`;
      rootElem.style.width = `${window.innerWidth}px`;
      // rootElem.style.height = `${window.screen.height}px`;
      rootElem.style.backgroundRepeat = 'no-repeat';
    }
  };

  return (
    <>
      <div>
        {Array.isArray(dataList) && dataList.length > 0 ? (
          <ImageGallery
            items={dataList}
            onSlide={(index) => handleBackGround(dataList, index)}
            lazyLoad
          />
        ) : (
          <ClipLoader
            color="#36d7b7"
            loading={true}
            cssOverride={override}
            size={80}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        )}
      </div>
    </>
  );
}

export default App;
