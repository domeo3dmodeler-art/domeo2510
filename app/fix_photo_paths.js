const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function fixPhotoPaths() {
  try {
    console.log("Исправление путей к фотографиям в БД...");
    
    const products = await prisma.product.findMany({
      where: {
        catalog_category: { name: "Межкомнатные двери" },
        is_active: true,
        properties_data: { contains: "photos" }
      },
      select: { id: true, sku: true, properties_data: true }
    });

    console.log("Найдено товаров с фото:", products.length);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products", "cmg50xcgs001cv7mn0tdyk1wo");
    const realFiles = fs.readdirSync(uploadDir);
    console.log("Найдено файлов в директории:", realFiles.length);

    let updatedCount = 0;

    for (const product of products) {
      try {
        const props = JSON.parse(product.properties_data || "{}");
        const photos = props.photos || [];
        
        if (photos.length === 0) continue;

        let hasChanges = false;
        const updatedPhotos = [];

        for (const photoPath of photos) {
          const fileName = path.basename(photoPath);
          const fileExists = realFiles.includes(fileName);
          
          if (fileExists) {
            updatedPhotos.push(photoPath);
          } else {
            const photoName = path.parse(fileName).name;
            const matchingFile = realFiles.find(file => {
              const fileBaseName = path.parse(file).name;
              return fileBaseName.includes(photoName) || photoName.includes(fileBaseName);
            });

            if (matchingFile) {
              const newPath = "/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/" + matchingFile;
              updatedPhotos.push(newPath);
              hasChanges = true;
              console.log("Обновлен путь:", photoPath, "->", newPath);
            } else {
              hasChanges = true;
              console.log("Удален несуществующий файл:", photoPath);
            }
          }
        }

        if (hasChanges) {
          props.photos = updatedPhotos;
          
          await prisma.product.update({
            where: { id: product.id },
            data: { properties_data: JSON.stringify(props) }
          });
          
          updatedCount++;
          console.log("Обновлен товар:", product.sku);
        }

      } catch (error) {
        console.error("Ошибка обработки товара", product.sku, ":", error.message);
      }
    }

    console.log("Завершено! Обновлено товаров:", updatedCount);

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotoPaths();
