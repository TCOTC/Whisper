# 两张图片沿着斜对角线合并成一张图片 https://blog.csdn.net/qq_29562209/article/details/135276832

from PIL import Image, ImageDraw
import logging
import os

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def Image_Merge(left_image_path, right_image_path, is_save=True):
    try:
        # 打开两张图片，并转成RGBA格式，用于调整透明图层
        logging.info(f"正在打开图片: {right_image_path} 和 {left_image_path}")
        image1 = Image.open(right_image_path).convert('RGBA')
        image2 = Image.open(left_image_path).convert('RGBA')

        # 检查图片尺寸是否相同
        if image1.size != image2.size:
            logging.warning("图片尺寸不同，正在调整尺寸...")
            # 如果尺寸不同，将两张图片调整为相同尺寸
            width = min(image1.width, image2.width)
            height = min(image1.height, image2.height)
            image1 = image1.resize((width, height))
            image2 = image2.resize((width, height))
            logging.info(f"调整后尺寸: {image1.size}")

        w, h = image1.size

        # 对vi图片作为背景，创建一个绘图对象
        draw = ImageDraw.Draw(image1)

        # 绘制一个斜对角线的三角形，即左上角的三角形，设置透明度为0
        logging.info("正在绘制透明三角形...")
        draw.polygon([(0, 0), (w, 0), (0, h)], fill=(0, 0, 0, 0))

        # 将二者叠加图层，并转成RGB格式
        logging.info("正在合并图片...")
        result = Image.alpha_composite(image2, image1).convert('RGB')

        # 再加一根白线，明显一点
        # draw = ImageDraw.Draw(result)
        # draw.line([w, 0, 0, h], fill="white", width=3)

        if is_save:
            # 保存图片为PNG格式
            output_path = r'D:\Admin\Downloads\result.png'
            logging.info(f"正在保存图片到: {output_path}")
            result.save(output_path)
            logging.info(f"图片保存成功！路径: {os.path.abspath(output_path)}")
        else:
            return result

    except Exception as e:
        logging.error(f"程序运行出错: {e}")
    finally:
        # 程序运行结束后等待用户输入
        input("按 Enter 键退出...")


# 两张图片的路径
right_image_path = r'D:\Admin\Downloads\暗黑主题.jpg'  # 右下角
left_image_path = r'D:\Admin\Downloads\明亮主题.jpg'  # 左上角
Image_Merge(left_image_path, right_image_path, is_save=True)
