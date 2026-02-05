import { spawn } from 'child_process';

function runHeifConvert(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = ['-q', '90', inputPath, outputPath];
    const proc = spawn('heif-convert', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => {
      const details = stderr.trim();
      reject(
        new Error(
          `heif-convert failed to start: ${error.message}${details ? ` (${details})` : ''}`,
        ),
      );
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const details = stderr.trim();
        reject(
          new Error(
            `heif-convert exited with code ${code}${details ? ` (${details})` : ''}`,
          ),
        );
      }
    });
  });
}

function runFfmpeg(inputPath, outputPath, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = ['-y', '-loglevel', 'error', '-i', inputPath, ...extraArgs, outputPath];
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });

    proc.on('error', (error) => {
      reject(new Error(`ffmpeg failed to start: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

function runFfprobe(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-select_streams',
      'v',
      '-show_entries',
      'stream=index,width,height,color_transfer,color_primaries,color_space,pix_fmt',
      '-of',
      'json',
      inputPath,
    ];
    const proc = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => {
      const details = stderr.trim();
      reject(
        new Error(
          `ffprobe failed to start: ${error.message}${details ? ` (${details})` : ''}`,
        ),
      );
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(error);
        }
      } else {
        const details = stderr.trim();
        reject(
          new Error(
            `ffprobe exited with code ${code}${details ? ` (${details})` : ''}`,
          ),
        );
      }
    });
  });
}

async function getBestImageStreamInfo(inputPath) {
  try {
    const result = await runFfprobe(inputPath);
    const streams = Array.isArray(result?.streams) ? result.streams : [];
    const candidates = streams.filter((stream) => {
      const width = Number(stream?.width);
      const height = Number(stream?.height);
      return Number.isFinite(width) && Number.isFinite(height);
    });

    if (candidates.length === 0) {
      return null;
    }

    const nonGrayCandidates = candidates.filter((stream) => {
      const pixFmt = typeof stream?.pix_fmt === 'string' ? stream.pix_fmt.toLowerCase() : '';
      return !pixFmt.startsWith('gray');
    });

    const pool = nonGrayCandidates.length > 0 ? nonGrayCandidates : candidates;
    let bestStream = null;
    let bestPixels = -1;

    for (const stream of pool) {
      const width = Number(stream?.width);
      const height = Number(stream?.height);
      const pixels = width * height;
      if (pixels > bestPixels) {
        bestPixels = pixels;
        bestStream = stream;
      }
    }

    return bestStream;
  } catch {
    return null;
  }
}

export async function convertHeicToJpeg(inputPath, outputPath) {
  try {
    await runHeifConvert(inputPath, outputPath);
  } catch (error) {
    const heifMessage = error instanceof Error ? error.message : 'heif-convert failed';
    try {
      const bestStream = await getBestImageStreamInfo(inputPath);
      const bestIndex =
        bestStream && typeof bestStream.index === 'number' ? bestStream.index : null;
      const mapArgs = bestIndex !== null ? ['-map', `0:${bestIndex}`] : [];
      const transfer = typeof bestStream?.color_transfer === 'string'
        ? bestStream.color_transfer.toLowerCase()
        : '';
      const colorSpace = typeof bestStream?.color_space === 'string'
        ? bestStream.color_space.toLowerCase()
        : '';
      const colorPrimaries = typeof bestStream?.color_primaries === 'string'
        ? bestStream.color_primaries.toLowerCase()
        : '';
      const isHdrTransfer = transfer === 'smpte2084' || transfer === 'arib-std-b67';
      const isHdrGamut =
        colorSpace.includes('bt2020') ||
        colorPrimaries.includes('bt2020') ||
        colorPrimaries.includes('smpte2084');
      const isHdr = isHdrTransfer || isHdrGamut;
      const toneMapFilter =
        'zscale=t=linear:npl=100,tonemap=bt2390:desat=0,' +
        'zscale=t=bt709:m=bt709:r=tv,format=yuv420p';
      const baseArgs = [...mapArgs, '-frames:v', '1', '-q:v', '2'];
      let ffmpegArgs = baseArgs;

      if (isHdr) {
        ffmpegArgs = ['-vf', toneMapFilter, ...baseArgs];
      } else {
        const inPrimaries = colorPrimaries || '';
        const inTransfer = transfer || '';
        const inMatrix = colorSpace || '';
        const needsColorFix =
          (inPrimaries && inPrimaries !== 'bt709') ||
          (inTransfer && inTransfer !== 'bt709') ||
          (inMatrix && !inMatrix.includes('bt709'));
        if (needsColorFix) {
          const colorFilter =
            `zscale=in_primaries=${inPrimaries || 'bt709'}` +
            `:in_transfer=${inTransfer || 'bt709'}` +
            `:in_matrix=${inMatrix || 'bt709'}` +
            ':primaries=bt709:transfer=bt709:matrix=bt709:range=full,format=yuv420p';
          ffmpegArgs = ['-vf', colorFilter, ...baseArgs];
        }
      }

      try {
        await runFfmpeg(inputPath, outputPath, ffmpegArgs);
      } catch (ffmpegError) {
        if (isHdr) {
          await runFfmpeg(inputPath, outputPath, baseArgs);
        } else {
          throw ffmpegError;
        }
      }
    } catch (ffmpegError) {
      const ffmpegMessage =
        ffmpegError instanceof Error ? ffmpegError.message : 'ffmpeg failed';
      throw new Error(`${heifMessage}; ${ffmpegMessage}`);
    }
  }
}
