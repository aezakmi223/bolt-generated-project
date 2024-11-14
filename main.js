let originalCanvas, symmetryCanvas;
let faceapi;

async function loadModels() {
  await Promise.all([
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
  ]);
}

async function init() {
  originalCanvas = document.getElementById('originalCanvas');
  symmetryCanvas = document.getElementById('symmetryCanvas');
  
  await loadModels();
  
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = await createImageFromFile(file);
  const detections = await detectFaceLandmarks(img);
  
  if (detections.length === 0) {
    alert('Yüz tespit edilemedi. Lütfen başka bir fotoğraf deneyin.');
    return;
  }

  drawOriginalImage(img, detections);
  analyzeSymmetry(detections[0].landmarks);
}

function createImageFromFile(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

async function detectFaceLandmarks(img) {
  return await faceapi.detectAllFaces(img)
    .withFaceLandmarks();
}

function drawOriginalImage(img, detections) {
  originalCanvas.width = img.width;
  originalCanvas.height = img.height;
  const ctx = originalCanvas.getContext('2d');
  
  ctx.drawImage(img, 0, 0);
  faceapi.draw.drawDetections(originalCanvas, detections);
  faceapi.draw.drawFaceLandmarks(originalCanvas, detections);
}

function analyzeSymmetry(landmarks) {
  const points = landmarks.positions;
  const midPoint = calculateMidPoint(points);
  
  // Yüz simetrisini hesapla
  const leftSide = getLeftSidePoints(points, midPoint.x);
  const rightSide = getRightSidePoints(points, midPoint.x);
  
  const symmetryScore = calculateSymmetryScore(leftSide, rightSide, midPoint);
  displayResults(symmetryScore);
  
  drawSymmetryVisualization(points, midPoint, symmetryScore);
}

function calculateMidPoint(points) {
  const nose = points[30]; // Burun ucu noktası
  return { x: nose.x, y: nose.y };
}

function getLeftSidePoints(points, midX) {
  return points.filter(p => p.x < midX);
}

function getRightSidePoints(points, midX) {
  return points.filter(p => p.x > midX);
}

function calculateSymmetryScore(leftPoints, rightPoints, midPoint) {
  let totalDiff = 0;
  const pairs = matchPoints(leftPoints, rightPoints, midPoint);
  
  pairs.forEach(pair => {
    const diff = Math.abs(
      Math.abs(pair.left.x - midPoint.x) - Math.abs(pair.right.x - midPoint.x)
    );
    totalDiff += diff;
  });
  
  const maxScore = 100;
  const score = Math.max(0, maxScore - (totalDiff / pairs.length) * 10);
  return Math.round(score);
}

function matchPoints(leftPoints, rightPoints, midPoint) {
  const pairs = [];
  leftPoints.forEach(left => {
    const right = findMatchingPoint(left, rightPoints, midPoint);
    if (right) {
      pairs.push({ left, right });
    }
  });
  return pairs;
}

function findMatchingPoint(point, points, midPoint) {
  const yThreshold = 2;
  return points.find(p => 
    Math.abs(p.y - point.y) < yThreshold &&
    Math.abs(Math.abs(p.x - midPoint.x) - Math.abs(point.x - midPoint.x)) < 10
  );
}

function drawSymmetryVisualization(points, midPoint, symmetryScore) {
  symmetryCanvas.width = originalCanvas.width;
  symmetryCanvas.height = originalCanvas.height;
  const ctx = symmetryCanvas.getContext('2d');
  
  // Orta çizgiyi çiz
  ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.moveTo(midPoint.x, 0);
  ctx.lineTo(midPoint.x, symmetryCanvas.height);
  ctx.stroke();
  
  // Simetri puanına göre renk belirle
  const hue = (symmetryScore / 100) * 120; // 0-120 arası (kırmızıdan yeşile)
  ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
  
  // Noktaları çiz
  points.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function displayResults(symmetryScore) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `
    <h2>Simetri Analizi Sonuçları</h2>
    <p>Simetri Puanı: ${symmetryScore}/100</p>
    <p>Değerlendirme: ${getSymmetryEvaluation(symmetryScore)}</p>
  `;
}

function getSymmetryEvaluation(score) {
  if (score >= 90) return 'Mükemmel simetri';
  if (score >= 80) return 'Çok iyi simetri';
  if (score >= 70) return 'İyi simetri';
  if (score >= 60) return 'Ortalama simetri';
  return 'Geliştirilmesi gereken simetri';
}

window.addEventListener('DOMContentLoaded', init);
