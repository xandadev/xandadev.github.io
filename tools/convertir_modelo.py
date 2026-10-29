# Reproduce src/assets/models/realesr-general-x4v3.onnx a partir de los pesos oficiales:
# https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
# (sha256 8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292)
# Requiere: pip install torch onnx onnxruntime numpy
import torch, torch.nn as nn, numpy as np
class SRVGGNetCompact(nn.Module):
    def __init__(s, num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4):
        super().__init__()
        s.upscale = upscale
        s.body = nn.ModuleList()
        s.body.append(nn.Conv2d(num_in_ch, num_feat, 3, 1, 1))
        s.body.append(nn.PReLU(num_parameters=num_feat))
        for _ in range(num_conv):
            s.body.append(nn.Conv2d(num_feat, num_feat, 3, 1, 1))
            s.body.append(nn.PReLU(num_parameters=num_feat))
        s.body.append(nn.Conv2d(num_feat, num_out_ch * upscale * upscale, 3, 1, 1))
        s.upsampler = nn.PixelShuffle(upscale)
    def forward(s, x):
        out = x
        for l in s.body: out = l(out)
        out = s.upsampler(out)
        return out + nn.functional.interpolate(x, scale_factor=s.upscale, mode='nearest')
m = SRVGGNetCompact()
sd = torch.load('realesr-general-x4v3.pth', map_location='cpu', weights_only=True)
m.load_state_dict(sd['params'] if 'params' in sd else sd, strict=True); m.eval()
x = torch.rand(1,3,64,64)
torch.onnx.export(m, x, 'realesr-general-x4v3.onnx', input_names=['input'], output_names=['output'],
  dynamic_axes={'input':{2:'h',3:'w'},'output':{2:'H',3:'W'}}, opset_version=17, dynamo=False)
import onnxruntime as ort
s = ort.InferenceSession('realesr-general-x4v3.onnx')
for hw in [(64,64),(37,53)]:
    t = torch.rand(1,3,*hw)
    with torch.no_grad(): a = m(t).numpy()
    b = s.run(None, {'input': t.numpy()})[0]
    print(hw, b.shape, 'maxdiff', float(np.abs(a-b).max()))
